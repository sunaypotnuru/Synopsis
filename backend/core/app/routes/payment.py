from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime
import razorpay
import logging

from app.core.config import settings
from app.core.security import get_current_user
from app.models.schemas import TokenPayload
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment"])

# Initialize Razorpay Client
try:
    razorpay_client = razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )
except Exception as e:
    logger.error(f"Failed to initialize Razorpay: {e}")
    razorpay_client = None


@router.post("/create-order")
async def create_order(
    payload: dict = Body(...), current_user: TokenPayload = Depends(get_current_user)
):
    """
    Creates a Razorpay order before finalizing an appointment.
    """
    # Payments disabled — return a mock order so booking flow continues
    if not settings.ENABLE_PAYMENTS:
        return {
            "success": True,
            "order_id": "mock_order_testing",
            "amount": int(payload.get("amount", 0) * 100),
            "currency": payload.get("currency", "INR"),
            "key_id": "mock_key",
            "payment_skipped": True,
        }

    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    amount = payload.get("amount")
    currency = payload.get("currency", "INR")
    receipt = payload.get(
        "receipt", f"receipt_{current_user.sub}_{int(datetime.now().timestamp())}"
    )

    if not amount or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    try:
        # Amount in paise (multiply by 100)
        order_amount = int(amount * 100)

        # Create order in Razorpay
        order_data = {
            "amount": order_amount,
            "currency": currency,
            "receipt": receipt,
            "payment_capture": 1,
        }

        razorpay_order = razorpay_client.order.create(data=order_data)

        return {
            "success": True,
            "order_id": razorpay_order["id"],
            "amount": order_amount,
            "currency": currency,
            "key_id": settings.RAZORPAY_KEY_ID,
        }

    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify")
async def verify_payment(
    payload: dict = Body(...), current_user: TokenPayload = Depends(get_current_user)
):
    """
    Verifies Razorpay payment signature after successful frontend checkout.
    """
    # Payments disabled — auto-approve and mark appointment as scheduled
    if not settings.ENABLE_PAYMENTS:
        appointment_id = payload.get("appointment_id")
        if appointment_id:
            try:
                supabase.table("appointments").update({"status": "scheduled"}).eq(
                    "id", appointment_id
                ).execute()
            except Exception:
                pass
        return {
            "success": True,
            "message": "Payment skipped (testing mode)",
            "payment_skipped": True,
        }

    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")

    razorpay_payment_id = payload.get("razorpay_payment_id")
    razorpay_order_id = payload.get("razorpay_order_id")
    razorpay_signature = payload.get("razorpay_signature")
    appointment_id = payload.get("appointment_id")

    if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
        raise HTTPException(
            status_code=400, detail="Missing payment verification fields"
        )

    try:
        # Verify Signature securely
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        }

        # This will throw a SignatureVerificationError if invalid
        razorpay_client.utility.verify_payment_signature(params_dict)

        # Update Appointment Status in Supabase
        if appointment_id:
            try:
                # Store the transaction mapping
                tx_data = {
                    "patient_id": current_user.sub,
                    "appointment_id": appointment_id,
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "status": "success",
                    "amount": payload.get("amount", 0),
                }

                # Try inserting into a payments log table (ignore if it doesn't exist)
                try:
                    supabase.table("payments").insert(tx_data).execute()
                except Exception as e:
                    logger.debug(f"Payment logging skipped (table may not exist): {e}")

                # Officially mark the appointment as PAID and SCHEDULED
                supabase.table("appointments").update({"status": "scheduled"}).eq(
                    "id", appointment_id
                ).execute()

            except Exception as db_err:
                logger.error(f"Failed to update appointment after payment: {db_err}")

        return {"success": True, "message": "Payment verified successfully"}

    except razorpay.errors.SignatureVerificationError:
        logger.warning(
            f"Invalid payment signature attempt for order {razorpay_order_id}"
        )
        raise HTTPException(status_code=400, detail="Invalid Payment Signature")
    except Exception as e:
        logger.error(f"Payment verification crashed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

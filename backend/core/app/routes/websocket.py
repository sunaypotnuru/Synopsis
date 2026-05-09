"""
WebSocket Routes for Real-Time Messaging.

Features:
- WebSocket connection endpoint
- Message event handling
- Read receipt events
- Typing indicators
- Online status

Based on 2026 WebSocket best practices:
- Event-driven architecture
- Error handling
- Authentication
- Heartbeat/ping-pong

References:
- https://websocket.org/guides/frameworks/fastapi/
- https://codelit.io/blog/websocket-real-time-architecture-patterns
"""

import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.services.websocket_manager import get_connection_manager
from app.services.message_service import (
    get_message_service,
    UnauthorizedAccessError,
)
from app.services.webrtc_signaling import get_webrtc_signaling_service
from app.services.call_quality_monitor import get_call_quality_monitor
from app.services.waiting_room_service import get_waiting_room_service
from app.core.security import get_current_user_ws

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/messages")
async def websocket_endpoint(
    websocket: WebSocket, token: str = Query(..., description="Authentication token")
):
    """
    WebSocket endpoint for real-time messaging.

    Query Parameters:
    - token: JWT authentication token

    Events (Client → Server):
    - send_message: Send a message
    - mark_read: Mark message as read
    - mark_delivered: Mark message as delivered
    - typing: Send typing indicator
    - heartbeat: Keep connection alive
    - join_conversation: Join conversation room
    - leave_conversation: Leave conversation room

    Events (Server → Client):
    - connected: Connection established
    - new_message: New message received
    - message_read: Message was read
    - message_delivered: Message was delivered
    - user_typing: User is typing
    - user_online: User came online
    - user_offline: User went offline
    - error: Error occurred
    """
    connection_manager = get_connection_manager()
    message_service = get_message_service()
    user_id = None

    try:
        # Authenticate user
        try:
            user = await get_current_user_ws(token)
            user_id = user.get("id") or user.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Authentication failed")
                return

        except Exception as auth_error:
            logger.error(f"WebSocket authentication error: {auth_error}")
            await websocket.close(code=1008, reason="Authentication failed")
            return

        # Connect user
        connected = await connection_manager.connect(websocket, user_id)

        if not connected:
            logger.error(f"Failed to connect user: {user_id[:8]}***")
            return

        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()

                # Parse JSON
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    await websocket.send_json(
                        {"type": "error", "error": "Invalid JSON"}
                    )
                    continue

                # Get event type
                event_type = event.get("type")

                if not event_type:
                    await websocket.send_json(
                        {"type": "error", "error": "Missing event type"}
                    )
                    continue

                # Handle events
                if event_type == "send_message":
                    await handle_send_message(
                        event, user_id, connection_manager, message_service
                    )

                elif event_type == "mark_read":
                    await handle_mark_read(
                        event, user_id, connection_manager, message_service
                    )

                elif event_type == "mark_delivered":
                    await handle_mark_delivered(event, user_id, message_service)

                elif event_type == "typing":
                    await handle_typing(event, user_id, connection_manager)

                elif event_type == "heartbeat":
                    await handle_heartbeat(user_id, connection_manager, websocket)

                elif event_type == "join_conversation":
                    await handle_join_conversation(event, user_id, connection_manager)

                elif event_type == "leave_conversation":
                    await handle_leave_conversation(event, user_id, connection_manager)

                else:
                    await websocket.send_json(
                        {"type": "error", "error": f"Unknown event type: {event_type}"}
                    )

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: {user_id[:8]}***")
                break

            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                try:
                    await websocket.send_json(
                        {"type": "error", "error": "Internal server error"}
                    )
                except Exception as send_error:
                    logger.error(f"Error sending error message: {send_error}")
                    break

    except Exception as e:
        logger.error(f"WebSocket error: {e}")

    finally:
        # Disconnect user
        if user_id:
            await connection_manager.disconnect(user_id)


async def handle_send_message(
    event: dict, user_id: str, connection_manager, message_service
):
    """Handle send_message event."""
    try:
        conversation_id = event.get("conversation_id")
        content = event.get("content")
        message_type = event.get("message_type", "text")

        if not conversation_id or not content:
            await connection_manager.send_personal_message(
                {"type": "error", "error": "Missing conversation_id or content"},
                user_id,
            )
            return

        # Send message
        message = await message_service.send_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            message_type=message_type,
        )

        # Broadcast to conversation participants
        await connection_manager.broadcast_to_conversation(
            {"type": "new_message", "message": message},
            conversation_id,
            exclude_user_id=None,  # Send to everyone including sender
        )

        logger.debug(f"Message sent via WebSocket: {message['id'][:8]}***")

    except UnauthorizedAccessError as e:
        await connection_manager.send_personal_message(
            {"type": "error", "error": str(e)}, user_id
        )
    except Exception as e:
        logger.error(f"Error in handle_send_message: {e}")
        await connection_manager.send_personal_message(
            {"type": "error", "error": "Failed to send message"}, user_id
        )


async def handle_mark_read(
    event: dict, user_id: str, connection_manager, message_service
):
    """Handle mark_read event."""
    try:
        message_id = event.get("message_id")

        if not message_id:
            await connection_manager.send_personal_message(
                {"type": "error", "error": "Missing message_id"}, user_id
            )
            return

        # Mark as read
        success = await message_service.mark_message_as_read(message_id, user_id)

        if success:
            # Get message to find conversation and sender
            from app.services.supabase import supabase

            message_result = (
                supabase.table("messages")
                .select("conversation_id, sender_id")
                .eq("id", message_id)
                .maybe_single()
                .execute()
            )

            if message_result.data:
                conversation_id = message_result.data["conversation_id"]
                sender_id = message_result.data["sender_id"]

                # Notify sender
                await connection_manager.send_personal_message(
                    {
                        "type": "message_read",
                        "message_id": message_id,
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                    },
                    sender_id,
                )

    except Exception as e:
        logger.error(f"Error in handle_mark_read: {e}")


async def handle_mark_delivered(event: dict, user_id: str, message_service):
    """Handle mark_delivered event."""
    try:
        message_id = event.get("message_id")

        if not message_id:
            return

        # Mark as delivered
        await message_service.mark_message_as_delivered(message_id, user_id)

    except Exception as e:
        logger.error(f"Error in handle_mark_delivered: {e}")


async def handle_typing(event: dict, user_id: str, connection_manager):
    """Handle typing event."""
    try:
        conversation_id = event.get("conversation_id")
        is_typing = event.get("is_typing", False)

        if not conversation_id:
            return

        # Broadcast typing indicator to conversation
        await connection_manager.broadcast_to_conversation(
            {
                "type": "user_typing",
                "conversation_id": conversation_id,
                "user_id": user_id,
                "is_typing": is_typing,
            },
            conversation_id,
            exclude_user_id=user_id,  # Don't send to sender
        )

    except Exception as e:
        logger.error(f"Error in handle_typing: {e}")


async def handle_heartbeat(user_id: str, connection_manager, websocket: WebSocket):
    """Handle heartbeat event."""
    try:
        # Update heartbeat timestamp
        await connection_manager.update_heartbeat(user_id)

        # Send pong response
        await websocket.send_json({"type": "pong"})

    except Exception as e:
        logger.error(f"Error in handle_heartbeat: {e}")


async def handle_join_conversation(event: dict, user_id: str, connection_manager):
    """Handle join_conversation event."""
    try:
        conversation_id = event.get("conversation_id")

        if not conversation_id:
            return

        # Add user to conversation tracking
        await connection_manager.add_to_conversation(user_id, conversation_id)

        # Notify other participants
        await connection_manager.broadcast_to_conversation(
            {
                "type": "user_online",
                "conversation_id": conversation_id,
                "user_id": user_id,
            },
            conversation_id,
            exclude_user_id=user_id,
        )

        logger.debug(
            f"User {user_id[:8]}*** joined conversation {conversation_id[:8]}***"
        )

    except Exception as e:
        logger.error(f"Error in handle_join_conversation: {e}")


async def handle_leave_conversation(event: dict, user_id: str, connection_manager):
    """Handle leave_conversation event."""
    try:
        conversation_id = event.get("conversation_id")

        if not conversation_id:
            return

        # Remove user from conversation tracking
        await connection_manager.remove_from_conversation(user_id, conversation_id)

        # Notify other participants
        await connection_manager.broadcast_to_conversation(
            {
                "type": "user_offline",
                "conversation_id": conversation_id,
                "user_id": user_id,
            },
            conversation_id,
            exclude_user_id=user_id,
        )

        logger.debug(
            f"User {user_id[:8]}*** left conversation {conversation_id[:8]}***"
        )

    except Exception as e:
        logger.error(f"Error in handle_leave_conversation: {e}")


# ==================== VIDEO CONSULTATION WEBSOCKET ====================


@router.websocket("/video/{consultation_id}")
async def video_signaling_endpoint(
    websocket: WebSocket,
    consultation_id: str,
    token: str = Query(..., description="Authentication token"),
):
    """
    WebSocket endpoint for video consultation signaling.

    Path Parameters:
    - consultation_id: Video consultation ID

    Query Parameters:
    - token: JWT authentication token

    Events (Client → Server):
    - offer: WebRTC offer (SDP)
    - answer: WebRTC answer (SDP)
    - ice_candidate: ICE candidate
    - quality_metrics: Call quality metrics
    - connection_state: Connection state update
    - heartbeat: Keep connection alive

    Events (Server → Client):
    - connected: Connection established
    - offer: WebRTC offer from peer
    - answer: WebRTC answer from peer
    - ice_candidate: ICE candidate from peer
    - quality_alert: Poor quality alert
    - peer_joined: Peer joined consultation
    - peer_left: Peer left consultation
    - consultation_ended: Consultation ended
    - error: Error occurred
    """
    signaling_service = get_webrtc_signaling_service()
    quality_monitor = get_call_quality_monitor()
    user_id = None

    try:
        # Authenticate user
        try:
            user = await get_current_user_ws(token)
            user_id = user.get("id") or user.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Authentication failed")
                return

        except Exception as auth_error:
            logger.error(f"Video WebSocket authentication error: {auth_error}")
            await websocket.close(code=1008, reason="Authentication failed")
            return

        # Accept connection
        await websocket.accept()

        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "consultation_id": consultation_id,
                "user_id": user_id,
                "ice_servers": signaling_service.get_ice_servers(),
            }
        )

        logger.info(
            f"Video WebSocket connected: user={user_id[:8]}***, consultation={consultation_id}"
        )

        # Main signaling loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                event_type = message.get("type")

                # Handle different event types
                if event_type == "offer":
                    # WebRTC offer
                    result = signaling_service.create_offer(
                        consultation_id=consultation_id,
                        user_id=user_id,
                        sdp=message.get("sdp"),
                        sdp_type="offer",
                    )

                    if result.get("success"):
                        # Broadcast offer to other participants
                        await websocket.send_json(
                            {
                                "type": "offer",
                                "from": user_id,
                                "sdp": message.get("sdp"),
                                "ice_servers": result.get("ice_servers"),
                            }
                        )
                        logger.debug(f"Offer created: {consultation_id}")
                    else:
                        await websocket.send_json(
                            {"type": "error", "error": result.get("error")}
                        )

                elif event_type == "answer":
                    # WebRTC answer
                    result = signaling_service.create_answer(
                        consultation_id=consultation_id,
                        user_id=user_id,
                        sdp=message.get("sdp"),
                        sdp_type="answer",
                    )

                    if result.get("success"):
                        # Broadcast answer to other participants
                        await websocket.send_json(
                            {
                                "type": "answer",
                                "from": user_id,
                                "sdp": message.get("sdp"),
                                "ice_servers": result.get("ice_servers"),
                            }
                        )
                        logger.debug(f"Answer created: {consultation_id}")
                    else:
                        await websocket.send_json(
                            {"type": "error", "error": result.get("error")}
                        )

                elif event_type == "ice_candidate":
                    # ICE candidate
                    result = signaling_service.add_ice_candidate(
                        consultation_id=consultation_id,
                        user_id=user_id,
                        candidate=message.get("candidate"),
                        sdp_mid=message.get("sdpMid"),
                        sdp_m_line_index=message.get("sdpMLineIndex"),
                    )

                    if result.get("success"):
                        # Broadcast ICE candidate to other participants
                        await websocket.send_json(
                            {
                                "type": "ice_candidate",
                                "from": user_id,
                                "candidate": message.get("candidate"),
                                "sdpMid": message.get("sdpMid"),
                                "sdpMLineIndex": message.get("sdpMLineIndex"),
                            }
                        )
                        logger.debug(f"ICE candidate added: {consultation_id}")
                    else:
                        await websocket.send_json(
                            {"type": "error", "error": result.get("error")}
                        )

                elif event_type == "quality_metrics":
                    # Call quality metrics
                    metrics = message.get("metrics", {})
                    result = quality_monitor.submit_metrics(
                        consultation_id=consultation_id,
                        user_id=user_id,
                        metrics=metrics,
                    )

                    if result.get("success"):
                        quality_score = result.get("quality_score")
                        quality_rating = result.get("quality_rating")

                        # Send quality feedback
                        await websocket.send_json(
                            {
                                "type": "quality_feedback",
                                "quality_score": quality_score,
                                "quality_rating": quality_rating,
                            }
                        )

                        # Send alert if quality is poor
                        if quality_rating == "poor":
                            diagnostics = quality_monitor.get_diagnostics(
                                consultation_id
                            )
                            await websocket.send_json(
                                {
                                    "type": "quality_alert",
                                    "quality_score": quality_score,
                                    "issues": diagnostics.get("issues", []),
                                    "recommendations": diagnostics.get(
                                        "recommendations", []
                                    ),
                                }
                            )
                    else:
                        await websocket.send_json(
                            {"type": "error", "error": result.get("error")}
                        )

                elif event_type == "connection_state":
                    # Connection state update
                    state = message.get("state")
                    result = signaling_service.update_connection_state(
                        consultation_id=consultation_id, state=state
                    )

                    if result.get("success"):
                        logger.info(
                            f"Connection state updated: {consultation_id} -> {state}"
                        )
                    else:
                        await websocket.send_json(
                            {"type": "error", "error": result.get("error")}
                        )

                elif event_type == "heartbeat":
                    # Heartbeat/ping
                    await websocket.send_json(
                        {"type": "heartbeat_ack", "timestamp": message.get("timestamp")}
                    )

                else:
                    # Unknown event type
                    await websocket.send_json(
                        {"type": "error", "error": f"Unknown event type: {event_type}"}
                    )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "error": "Invalid JSON"})
            except Exception as e:
                logger.error(f"Error handling video signaling event: {e}")
                await websocket.send_json({"type": "error", "error": str(e)})

    except WebSocketDisconnect:
        logger.info(
            f"Video WebSocket disconnected: user={user_id[:8] if user_id else 'unknown'}***, consultation={consultation_id}"
        )

        # Clean up signaling data
        if user_id:
            signaling_service.cleanup_session(consultation_id)

    except Exception as e:
        logger.error(f"Video WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception as close_error:
            logger.error(f"Error closing websocket: {close_error}")
            pass


@router.websocket("/waiting-room/{doctor_id}")
async def waiting_room_endpoint(
    websocket: WebSocket,
    doctor_id: str,
    token: str = Query(..., description="Authentication token"),
):
    """
    WebSocket endpoint for waiting room notifications.

    Path Parameters:
    - doctor_id: Doctor user ID

    Query Parameters:
    - token: JWT authentication token

    Events (Client → Server):
    - heartbeat: Keep connection alive

    Events (Server → Client):
    - connected: Connection established
    - patient_joined: Patient joined waiting room
    - patient_left: Patient left waiting room
    - queue_updated: Queue position updated
    - patient_called: Patient was called
    - heartbeat_ack: Heartbeat acknowledgment
    """
    waiting_room_service = get_waiting_room_service()
    user_id = None

    try:
        # Authenticate user
        try:
            user = await get_current_user_ws(token)
            user_id = user.get("id") or user.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Authentication failed")
                return

        except Exception as auth_error:
            logger.error(f"Waiting room WebSocket authentication error: {auth_error}")
            await websocket.close(code=1008, reason="Authentication failed")
            return

        # Accept connection
        await websocket.accept()

        # Get initial queue
        queue_result = waiting_room_service.get_queue(doctor_id)

        # Send connection confirmation with queue
        await websocket.send_json(
            {
                "type": "connected",
                "doctor_id": doctor_id,
                "queue": queue_result.get("queue", []),
                "total_waiting": queue_result.get("total_waiting", 0),
            }
        )

        logger.info(f"Waiting room WebSocket connected: doctor={doctor_id[:8]}***")

        # Main loop for heartbeat
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                event_type = message.get("type")

                if event_type == "heartbeat":
                    # Send heartbeat acknowledgment with updated queue
                    queue_result = waiting_room_service.get_queue(doctor_id)
                    await websocket.send_json(
                        {
                            "type": "heartbeat_ack",
                            "timestamp": message.get("timestamp"),
                            "queue": queue_result.get("queue", []),
                            "total_waiting": queue_result.get("total_waiting", 0),
                        }
                    )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "error": "Invalid JSON"})
            except Exception as e:
                logger.error(f"Error handling waiting room event: {e}")
                await websocket.send_json({"type": "error", "error": str(e)})

    except WebSocketDisconnect:
        logger.info(f"Waiting room WebSocket disconnected: doctor={doctor_id[:8]}***")

    except Exception as e:
        logger.error(f"Waiting room WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception as close_error:
            logger.error(f"Error closing websocket: {close_error}")
            pass

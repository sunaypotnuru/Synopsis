"""
eye_extractor.py - Lower Conjunctiva Extraction
Extracts ONLY the inferior palpebral conjunctiva (below iris)
Matches training data distribution: isolated tissue on black background
"""

import cv2
import mediapipe as mp
import numpy as np
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EyeExtractor:
    """
    Extracts LOWER CONJUNCTIVA ONLY as isolated tissue on black background.
    Uses MediaPipe iris + lower eyelid landmarks to precisely isolate
    the region BELOW the iris (inferior palpebral conjunctiva).
    """

    def __init__(self):
        """Initialize MediaPipe Face Mesh with iris landmarks"""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,  # Required for iris landmarks (468-477)
            min_detection_confidence=0.3,
            min_tracking_confidence=0.5,
        )

        # ===== LOWER EYELID LANDMARKS ONLY =====
        # These trace the lower conjunctiva crescent (below iris)
        # Left eye: inner corner → lower lid curve → outer corner
        self.left_lower_lid_indices = [
            33,  # inner corner
            7,  # inner lower
            163,  # lower inner curve
            144,  # lower mid-inner
            145,  # lower mid
            153,  # lower mid-outer
            154,  # lower outer curve
            155,  # outer lower
            133,  # outer corner
        ]

        # Right eye: inner corner → lower lid curve → outer corner
        self.right_lower_lid_indices = [
            362,  # inner corner
            382,  # inner lower
            381,  # lower inner curve
            380,  # lower mid-inner
            374,  # lower mid
            373,  # lower mid-outer
            390,  # lower outer curve
            249,  # outer lower
            263,  # outer corner
        ]

        # Iris center landmarks (from refine_landmarks)
        self.left_iris_center = 468
        self.right_iris_center = 473

        # Full eye contour for reference (upper boundary line)
        self.left_upper_indices = [33, 246, 161, 160, 159, 158, 157, 173, 133]
        self.right_upper_indices = [362, 398, 384, 385, 386, 387, 388, 466, 263]

        # Validation thresholds
        self.min_roi_width = (
            40  # minimum pixels width for valid ROI (Clinical Safeguard)
        )
        self.min_roi_height = (
            20  # minimum pixels height for valid ROI (Clinical Safeguard)
        )
        self.max_dark_ratio = 0.70  # reject if >70% dark pixels (iris leakage)
        self.dark_pixel_threshold = 30  # pixel value below which is "dark"
        self.overexposed_threshold = 245  # intensity above which is "overexposed"
        self.max_overexposed_ratio = 0.3  # reject if >30% pixels are overexposed

        logger.info("EyeExtractor initialized — LOWER CONJUNCTIVA ONLY mode")

    def is_already_cropped(self, image: np.ndarray) -> bool:
        """
        Check if image is already a cropped conjunctiva.
        Skips extraction for pre-processed dataset images.
        """
        from config import EXTRACTION_SIZE_THRESHOLD, AUTO_SKIP_EXTRACTION

        if not AUTO_SKIP_EXTRACTION:
            return False

        h, w = image.shape[:2]

        if h <= EXTRACTION_SIZE_THRESHOLD and w <= EXTRACTION_SIZE_THRESHOLD:
            aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 1
            if aspect < 1.5:
                return True

        return False

    def _prepad_for_mediapipe(self, image: np.ndarray) -> np.ndarray:
        """
        Pre-pad close-up images to help MediaPipe detect faces.
        MediaPipe works better when the face occupies a reasonable proportion.
        """
        h, w = image.shape[:2]

        # If image is very large (likely a high-res close-up), resize it down first
        # MediaPipe struggles with 4K eyes but works great on 500px faces
        max_dim = max(h, w)
        if max_dim > 1000:
            scale = 500 / max_dim
            image = cv2.resize(image, (int(w * scale), int(h * scale)))
            h, w = image.shape[:2]

        # Now pad it into a large black canvas
        # We want the 'eye' to look like a small part of a larger face
        size = max(h, w) * 4
        padded = np.zeros((size, size, 3), dtype=np.uint8)
        y_off = (size - h) // 2
        x_off = (size - w) // 2
        padded[y_off : y_off + h, x_off : x_off + w] = image
        return padded

    # =====================================================================
    #  UNIFIED PUBLIC API
    # =====================================================================

    def extract_lower_conjunctiva(
        self,
        image: np.ndarray,
        eye: str = "left",
        debug: bool = False,
        session_id: str = None,
    ) -> np.ndarray:
        """
        Extract ONLY the lower conjunctiva region (below iris).

        Pipeline:
            1. Check if already cropped → use as-is
            2. MediaPipe iris-based lower conjunctiva extraction
            3. MediaPipe standard lower-lid polygon extraction
            4. MediaPipe with pre-padded image
            5. Haar cascade + lower region
            6. Edge detection + lower region
            7. Center crop fallback

        Args:
            image: BGR image (full face or eye close-up)
            eye: 'left' or 'right'
            debug: Whether to save intermediate raw ROI before resizing
            session_id: Optional ID for the file name if saving debug images

        Returns:
            64x64x3 numpy array with isolated lower conjunctiva on black background
        """
        # ===== STEP 1: Check if already cropped =====
        if self.is_already_cropped(image):
            logger.info("Image already cropped — using as-is")
            return cv2.resize(image, (64, 64))

        # ===== STEP 2: Haar cascade + lower region (Fast & Good for extreme close-ups) =====
        try:
            result = self._extract_lower_with_haar(
                image, debug=debug, session_id=session_id
            )
            if result is not None:
                logger.info("✅ Extracted lower conjunctiva using Haar cascade")
                return result
        except Exception as e:
            logger.warning(f"Haar cascade primary failed: {e}")

        # ===== STEP 3: MediaPipe iris-based lower conjunctiva (best for full face/mid distance) =====
        try:
            result = self._extract_below_iris(
                image, eye, debug=debug, session_id=session_id
            )
            if result is not None:
                logger.info("✅ Extracted lower conjunctiva using iris-based method")
                return result
        except Exception as e:
            logger.warning(f"Iris-based extraction failed: {e}")

        # ===== STEP 4: MediaPipe standard lower-lid polygon extraction =====
        try:
            result = self._extract_lower_lid_polygon(
                image, eye, debug=debug, session_id=session_id
            )
            if result is not None:
                logger.info("✅ Extracted lower conjunctiva using lower-lid polygon")
                return result
        except Exception as e:
            logger.warning(f"Lower-lid polygon extraction failed: {e}")

        # ===== STEP 5: Try with pre-padded image (helps MediaPipe on tight crops) =====
        try:
            padded = self._prepad_for_mediapipe(image)
            if padded is not image:
                logger.info("Trying MediaPipe with pre-padded image")
                result = self._extract_below_iris(
                    padded, eye, debug=debug, session_id=session_id
                )
                if result is not None:
                    logger.info("✅ Extracted with pre-padded image (iris method)")
                    return result
                result = self._extract_lower_lid_polygon(
                    padded, eye, debug=debug, session_id=session_id
                )
                if result is not None:
                    logger.info("✅ Extracted with pre-padded image (polygon method)")
                    return result
        except Exception as e:
            logger.warning(f"Pre-padded extraction failed: {e}")

        # ===== STEP 6: Edge detection + lower region (Last resort automated) =====
        try:
            result = self._extract_lower_with_edges(
                image, debug=debug, session_id=session_id
            )
            if result is not None:
                logger.info("✅ Extracted lower conjunctiva using edge detection")
                return result
        except Exception as e:
            logger.warning(f"Edge detection fallback failed: {e}")

        # ===== STEP 7: Ultimate fallback =====
        logger.warning("⚠️ All methods failed — using lower-center crop fallback")
        return self._lower_center_crop_fallback(
            image, debug=debug, session_id=session_id
        )

    # Keep old name as alias for backward compatibility
    def extract_conjunctiva(
        self,
        image: np.ndarray,
        eye: str = "left",
        debug: bool = False,
        session_id: str = None,
    ) -> np.ndarray:
        """Backward-compatible alias for extract_lower_conjunctiva"""
        return self.extract_lower_conjunctiva(
            image, eye, debug=debug, session_id=session_id
        )

    # =====================================================================
    #  METHOD 1: IRIS-BASED LOWER CONJUNCTIVA (Primary method)
    # =====================================================================

    def _extract_below_iris(
        self, image: np.ndarray, eye: str, debug: bool = False, session_id: str = None
    ) -> np.ndarray:
        """
        Use iris center as the TOP boundary, lower eyelid as BOTTOM boundary.
        This precisely isolates the inferior palpebral conjunctiva.

        ROI Definition:
            Top    → bottom edge of iris (iris_center_y + small offset)
            Bottom → lower eyelid landmarks + expansion
            Left   → leftmost lower lid landmark
            Right  → rightmost lower lid landmark
        """
        h, w = image.shape[:2]
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(image_rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0]

        # Check we have iris landmarks (need refine_landmarks=True)
        if len(landmarks.landmark) < 478:
            return None

        # Get iris center
        iris_idx = self.left_iris_center if eye == "left" else self.right_iris_center
        iris_lm = landmarks.landmark[iris_idx]
        _iris_x, iris_y = int(iris_lm.x * w), int(iris_lm.y * h)

        # Get lower eyelid points
        lower_indices = (
            self.left_lower_lid_indices
            if eye == "left"
            else self.right_lower_lid_indices
        )
        lower_points = []
        for idx in lower_indices:
            lm = landmarks.landmark[idx]
            lower_points.append([int(lm.x * w), int(lm.y * h)])
        lower_points = np.array(lower_points, dtype=np.int32)

        # Get upper eye points (for creating the upper boundary line)
        upper_indices = (
            self.left_upper_indices if eye == "left" else self.right_upper_indices
        )
        upper_points = []
        for idx in upper_indices:
            lm = landmarks.landmark[idx]
            upper_points.append([int(lm.x * w), int(lm.y * h)])
        upper_points = np.array(upper_points, dtype=np.int32)

        # --- Define ROI boundaries ---
        # Top: start from iris center (conjunctiva is BELOW iris)
        roi_top = iris_y

        # Bottom: lowest lower-lid landmark + expansion for conjunctiva
        lower_y_max = lower_points[:, 1].max()
        expand_down = int((lower_y_max - iris_y) * 0.4)
        roi_bottom = min(h, lower_y_max + expand_down)

        # Left/Right: horizontal span of lower lid landmarks with padding
        roi_left = lower_points[:, 0].min()
        roi_right = lower_points[:, 0].max()
        pad_x = int((roi_right - roi_left) * 0.1)
        roi_left = max(0, roi_left - pad_x)
        roi_right = min(w, roi_right + pad_x)

        # Validate ROI height
        roi_height = roi_bottom - roi_top
        if roi_height < self.min_roi_height:
            logger.warning(f"ROI too small: height={roi_height}px")
            return None

        # --- Create crescent mask for lower conjunctiva ---
        # Upper boundary: straight line at iris level between eye corners
        inner_corner = lower_points[0]  # first point = inner corner
        outer_corner = lower_points[-1]  # last point = outer corner

        # Build polygon: iris-level line across top + lower lid curve at bottom
        upper_line = np.array(
            [
                [inner_corner[0], iris_y],
                [outer_corner[0], iris_y],
            ],
            dtype=np.int32,
        )

        # Combine: upper line (L→R) + lower lid points (R→L for closed polygon)
        lower_reversed = lower_points[::-1]  # reverse so polygon closes properly
        crescent_polygon = np.vstack([upper_line, lower_reversed])

        # Crop ROI region
        roi = image[roi_top:roi_bottom, roi_left:roi_right]
        if roi.size == 0:
            return None

        # Shift polygon to ROI coordinates
        shifted_polygon = crescent_polygon - [roi_left, roi_top]

        # Create and apply initial mask
        mask = np.zeros(roi.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [shifted_polygon], 255)

        # --- NEW: Aggressive Color + Blob Refinement ---
        mask = self._refine_with_color_mask(roi, mask)

        segmented = cv2.bitwise_and(roi, roi, mask=mask)

        # --- Validate: check for iris contamination (too many dark pixels) ---
        if not self._validate_conjunctiva(segmented, mask):
            logger.warning("Iris contamination detected — adjusting")
            # Push top boundary lower to avoid iris
            adjusted_top = iris_y + int((lower_y_max - iris_y) * 0.3)
            roi = image[adjusted_top:roi_bottom, roi_left:roi_right]
            if roi.size == 0:
                return None
            shifted_polygon = crescent_polygon - [roi_left, adjusted_top]
            mask = np.zeros(roi.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [shifted_polygon], 255)
            segmented = cv2.bitwise_and(roi, roi, mask=mask)

        # Tight crop to tissue
        tissue = self._tight_crop(segmented)
        if tissue is None:
            return None

        if debug:
            self._save_debug_roi(tissue, "iris_based", session_id)

        return self._resize_and_pad(tissue)

    # =====================================================================
    #  METHOD 2: LOWER-LID POLYGON (when iris landmarks unavailable)
    # =====================================================================

    def _extract_lower_lid_polygon(
        self, image: np.ndarray, eye: str, debug: bool = False, session_id: str = None
    ) -> np.ndarray:
        """
        Uses lower eyelid landmarks to create a lower-conjunctiva polygon mask.
        Falls back to this when iris landmarks are not available.
        """
        h, w = image.shape[:2]
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(image_rgb)

        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0]
        lower_indices = (
            self.left_lower_lid_indices
            if eye == "left"
            else self.right_lower_lid_indices
        )

        # Get lower lid points
        lower_points = []
        for idx in lower_indices:
            lm = landmarks.landmark[idx]
            lower_points.append([int(lm.x * w), int(lm.y * h)])
        lower_points = np.array(lower_points, dtype=np.int32)

        # Get bounding box of lower lid
        x, y, bw, bh = cv2.boundingRect(lower_points)

        # The conjunctiva is the lower HALF of the eye opening
        # Use the midpoint of the eye as the top boundary
        inner_corner = lower_points[0]
        outer_corner = lower_points[-1]
        mid_y = (inner_corner[1] + outer_corner[1]) // 2

        # Expand downward to capture full conjunctiva
        expand_down = int(bh * 0.5)
        bottom = min(h, y + bh + expand_down)

        # Horizontal padding
        pad_x = int(bw * 0.1)
        left = max(0, x - pad_x)
        right = min(w, x + bw + pad_x)

        # Build crescent: straight line at mid-eye level + lower lid curve
        upper_line = np.array(
            [
                [inner_corner[0], mid_y],
                [outer_corner[0], mid_y],
            ],
            dtype=np.int32,
        )
        lower_reversed = lower_points[::-1]
        crescent_polygon = np.vstack([upper_line, lower_reversed])

        # Crop ROI
        roi = image[mid_y:bottom, left:right]
        if roi.size == 0:
            return None

        # Shift and mask
        shifted_polygon = crescent_polygon - [left, mid_y]
        mask = np.zeros(roi.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [shifted_polygon], 255)

        # --- NEW: Color Refinement ---
        mask = self._refine_with_color_mask(roi, mask)

        segmented = cv2.bitwise_and(roi, roi, mask=mask)

        # Validate
        if not self._validate_conjunctiva(segmented, mask):
            return None

        tissue = self._tight_crop(segmented)
        if tissue is None:
            return None

        if debug:
            self._save_debug_roi(tissue, "polygon", session_id)

        return self._resize_and_pad(tissue)

    # =====================================================================
    #  METHOD 3: HAAR CASCADE + LOWER REGION
    # =====================================================================

    def _extract_lower_with_haar(
        self, image: np.ndarray, debug: bool = False, session_id: str = None
    ) -> np.ndarray:
        """
        Use Haar cascade to detect the eye, then extract only the bottom 40%.
        Applies a crescent mask to exclude skin and iris.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )
        eyes = eye_cascade.detectMultiScale(gray, 1.1, 3)

        if len(eyes) == 0:
            return None

        # Take the largest detected eye
        x, y, w, h = max(eyes, key=lambda rect: rect[2] * rect[3])

        # Extract ONLY the bottom 40% (below iris = lower conjunctiva)
        # We take a slightly wider and taller region to ensure we don't cut off tissue
        conj_top = y + int(h * 0.55)
        conj_bottom = min(image.shape[0], y + h + int(h * 0.1))
        conj_left = max(0, x - int(w * 0.05))
        conj_right = min(image.shape[1], x + w + int(w * 0.05))

        roi = image[conj_top:conj_bottom, conj_left:conj_right]
        if roi.size == 0:
            return None

        # --- Apply Crescent Mask to Haar Crop ---
        # Since Haar doesn't give us landmarks, we approximate the crescent
        # with an elliptical mask.
        rh, rw = roi.shape[:2]
        mask = np.zeros((rh, rw), dtype=np.uint8)

        # Draw a horizontal ellipse that touches the bottom-center
        # but curves up at the corners
        center_x = rw // 2
        center_y = int(rh * 0.2)  # center slightly high
        axes = (int(rw * 0.45), int(rh * 0.7))
        cv2.ellipse(mask, (center_x, center_y), axes, 0, 0, 180, 255, -1)

        # --- NEW: Color Refinement ---
        mask = self._refine_with_color_mask(roi, mask)

        segmented = cv2.bitwise_and(roi, roi, mask=mask)

        # Validate result
        if not self._validate_conjunctiva(segmented, mask):
            return None

        # Tight crop to remove excessive black space
        tissue = self._tight_crop(segmented)
        if tissue is None:
            return segmented  # return raw if tight crop fails

        if debug:
            self._save_debug_roi(tissue, "haar_masked", session_id)

        return self._resize_and_pad(tissue)

    # =====================================================================
    #  METHOD 4: EDGE DETECTION + LOWER REGION
    # =====================================================================

    def _extract_lower_with_edges(
        self, image: np.ndarray, debug: bool = False, session_id: str = None
    ) -> np.ndarray:
        """
        Fallback: edge detection to find eye contour, extract bottom 35%.
        """
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 30, 100)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        edges = cv2.dilate(edges, kernel, iterations=2)

        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return None

        largest = max(contours, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest)

        # Focus on LOWER 35% only (below iris region)
        conj_y = y + int(bh * 0.55)
        conj_h = int(bh * 0.35)

        tissue = image[conj_y : conj_y + conj_h, x : x + bw]
        if tissue.size == 0:
            return None

        # Validate result (using a full mask for the ROI)
        dummy_mask = np.ones(tissue.shape[:2], dtype=np.uint8) * 255
        if not self._validate_conjunctiva(tissue, dummy_mask):
            return None

        if debug:
            self._save_debug_roi(tissue, "edges", session_id)

        return self._resize_and_pad(tissue)

    # =====================================================================
    #  FALLBACK: LOWER CENTER CROP
    # =====================================================================

    def _lower_center_crop_fallback(
        self, image: np.ndarray, debug: bool = False, session_id: str = None
    ) -> np.ndarray:
        """
        Last resort: take a square crop from the lower-center of the image.
        Assumes the conjunctiva is in the lower half.
        """
        h, w = image.shape[:2]
        size = min(h // 2, w)  # half height, full width
        x = (w - size) // 2
        y = h // 2  # start from the middle (lower half)
        crop = image[y : y + size, x : x + size]

        # Validate result (using a full mask for the ROI)
        dummy_mask = np.ones(crop.shape[:2], dtype=np.uint8) * 255
        if not self._validate_conjunctiva(crop, dummy_mask):
            return None

        if debug:
            self._save_debug_roi(crop, "center_crop", session_id)

        return self._resize_and_pad(crop)

    def _refine_with_color_mask(
        self, roi: np.ndarray, initial_mask: np.ndarray
    ) -> np.ndarray:
        """
        Refine a mask by targeting only the primary pink/red tissue blob.
        Ultra-aggressive filtering to remove any skin or hair.
        """
        # 1. HSV Filtering (Standard)
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        lower_red1 = np.array([0, 50, 60])  # High min saturation for tissue
        upper_red1 = np.array([15, 255, 255])
        lower_red2 = np.array([160, 50, 60])
        upper_red2 = np.array([179, 255, 255])
        mask_hsv = cv2.bitwise_or(
            cv2.inRange(hsv, lower_red1, upper_red1),
            cv2.inRange(hsv, lower_red2, upper_red2),
        )

        # 2. Lab Color Space Filtering (Excellent for Red/Pink tissue)
        # 'a' channel represents Green-Red axis. High values = Red/Pink.
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2Lab)
        a_channel = lab[:, :, 1]
        _, mask_lab = cv2.threshold(
            a_channel, 130, 255, cv2.THRESH_BINARY
        )  # tissue is usually >145

        # 3. Brightness mask
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, bright_mask = cv2.threshold(
            gray, self.dark_pixel_threshold + 5, 255, cv2.THRESH_BINARY
        )

        # Combine filters
        refined = cv2.bitwise_and(mask_hsv, mask_lab)
        refined = cv2.bitwise_and(refined, bright_mask)
        refined = cv2.bitwise_and(refined, initial_mask)

        # 4. Cleaning
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        refined = cv2.morphologyEx(refined, cv2.MORPH_OPEN, kernel, iterations=1)

        # 5. Connected Components: Keep ONLY the single best "crescent" blob
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            refined, connectivity=8
        )

        if num_labels < 2:
            return refined

        best_label = -1
        max_score = -1

        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            w_blob = stats[i, cv2.CC_STAT_WIDTH]
            h_blob = stats[i, cv2.CC_STAT_HEIGHT]
            aspect = w_blob / h_blob if h_blob > 0 else 1

            # Score blobs based on Area and Aspect ratio (crescents are wide)
            if area > 100:
                score = area * min(aspect, 5.0)  # Reward width but cap reward
                if score > max_score:
                    max_score = score
                    best_label = i

        final_mask = np.zeros_like(refined)
        if best_label != -1:
            final_mask[labels == best_label] = 255

        return final_mask

    # =====================================================================
    #  HELPER FUNCTIONS
    # =====================================================================

    def _validate_conjunctiva(self, segmented: np.ndarray, mask: np.ndarray) -> bool:
        """
        Validate that the extracted region is usable for clinical inference.

        Checks:
        - Not too many dark pixels (iris is dark)
        - Not overexposed (saturation)
        - Resolution meets minimum feature requirement
        """
        # Get pixels within mask
        gray = cv2.cvtColor(segmented, cv2.COLOR_BGR2GRAY)
        tissue_pixels = gray[mask > 0]

        if len(tissue_pixels) == 0:
            return False

        # Check resolution (Fail-safe for low-res inputs)
        # We check the bounding box of non-zero pixels
        coords = cv2.findNonZero(mask)
        if coords is not None:
            _, _, w, h = cv2.boundingRect(coords)
            if w < self.min_roi_width or h < self.min_roi_height:
                logger.warning(
                    f"Resolution too low: {w}x{h} (Min: {self.min_roi_width}x{self.min_roi_height})"
                )
                return False

        # Check dark pixel ratio (iris contamination / underexposure)
        dark_count = np.sum(tissue_pixels < self.dark_pixel_threshold)
        dark_ratio = dark_count / len(tissue_pixels)
        if dark_ratio > self.max_dark_ratio:
            logger.warning(f"Failed exposure/dark check: {dark_ratio:.1%} dark pixels")
            return False

        # Check overexposure (Saturation check)
        over_count = np.sum(tissue_pixels > self.overexposed_threshold)
        over_ratio = over_count / len(tissue_pixels)
        if over_ratio > self.max_overexposed_ratio:
            logger.warning(
                f"Failed exposure/overexposed check: {over_ratio:.1%} saturated pixels"
            )
            return False

        # Check minimum tissue area
        if len(tissue_pixels) < 200:  # Increased from 50 for clinical robustness
            logger.warning(f"Tissue area too small: {len(tissue_pixels)}px")
            return False

        return True

    def _tight_crop(self, segmented: np.ndarray) -> np.ndarray:
        """Crop tightly to non-zero pixels (tissue region)."""
        gray = cv2.cvtColor(segmented, cv2.COLOR_BGR2GRAY)
        mask_pts = np.column_stack(np.where(gray > 5))

        if len(mask_pts) == 0:
            return None

        y_min, x_min = mask_pts.min(axis=0)
        y_max, x_max = mask_pts.max(axis=0)
        tissue = segmented[y_min : y_max + 1, x_min : x_max + 1]

        if tissue.size == 0:
            return None

        return tissue

    def _resize_and_pad(self, tissue: np.ndarray) -> np.ndarray:
        """
        Resize tissue so that its area matches training data,
        then pad/center on 64x64 black background.
        """
        h, w = tissue.shape[:2]
        current_area = h * w
        # Scale to 64x64 (~44% of 4096 is ~1800 pixels)
        target_area = 1800

        if current_area <= 0:
            return None

        scale = np.sqrt(target_area / current_area)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))

        # Cap to 64x64 max
        if new_w > 64:
            ratio = 64 / new_w
            new_w = 64
            new_h = max(1, int(new_h * ratio))
        if new_h > 64:
            ratio = 64 / new_h
            new_h = 64
            new_w = max(1, int(new_w * ratio))

        try:
            resized = cv2.resize(
                tissue, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4
            )
            final = np.zeros((64, 64, 3), dtype=np.uint8)
            y_off = (64 - new_h) // 2
            x_off = (64 - new_w) // 2
            final[y_off : y_off + new_h, x_off : x_off + new_w] = resized
            return final
        except Exception:
            return None

    def _save_debug_roi(self, tissue: np.ndarray, method: str, session_id: str = None):
        import time

        debug_dir = Path("outputs") / "intermediate_rois"
        debug_dir.mkdir(parents=True, exist_ok=True)

        timestamp = int(time.time() * 1000)
        prefix = f"{session_id}_" if session_id else ""

        raw_path = debug_dir / f"{prefix}raw_roi_{method}_{timestamp}.jpg"
        cv2.imwrite(str(raw_path), tissue)

        logger.info(f"Saved debug ROI: {raw_path}")

    # =====================================================================
    #  DEBUG VISUALIZATION
    # =====================================================================

    def debug_extraction(self, image_path: str, output_dir: str = None):
        """
        Debug function: visualize each extraction step.
        Saves intermediate images with ROI rectangles drawn.
        """
        from datetime import datetime

        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Cannot read image: {image_path}")
            return None

        if output_dir is None:
            output_dir = Path.home() / "Desktop" / "extraction_debug"
        else:
            output_dir = Path(output_dir)

        output_dir.mkdir(exist_ok=True, parents=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        src_name = Path(image_path).stem
        base_name = f"{src_name}_{timestamp}"

        h, w = image.shape[:2]
        print(f"\n{'='*60}")
        print(f"DEBUG EXTRACTION: {Path(image_path).name}")
        print(f"{'='*60}")
        print(f"  Image size: {w}x{h}")
        print(f"  Already cropped: {self.is_already_cropped(image)}")

        # Save original
        cv2.imwrite(str(output_dir / f"{base_name}_01_original.jpg"), image)

        # --- MediaPipe landmark detection ---
        try:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(image_rgb)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0]
                num_landmarks = len(landmarks.landmark)
                print(f"  MediaPipe: {num_landmarks} landmarks detected")
                print(f"  Iris landmarks: {'YES' if num_landmarks >= 478 else 'NO'}")

                # Draw landmarks + iris on image
                img_annotated = image.copy()

                # Draw lower lid landmarks in GREEN
                for idx in self.left_lower_lid_indices + self.right_lower_lid_indices:
                    lm = landmarks.landmark[idx]
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(img_annotated, (cx, cy), 3, (0, 255, 0), -1)

                # Draw upper lid landmarks in BLUE
                for idx in self.left_upper_indices + self.right_upper_indices:
                    lm = landmarks.landmark[idx]
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(img_annotated, (cx, cy), 3, (255, 0, 0), -1)

                # Draw iris centers in RED
                if num_landmarks >= 478:
                    for idx in [468, 473]:
                        lm = landmarks.landmark[idx]
                        cx, cy = int(lm.x * w), int(lm.y * h)
                        cv2.circle(img_annotated, (cx, cy), 5, (0, 0, 255), -1)
                        # Draw horizontal line at iris level
                        cv2.line(img_annotated, (0, cy), (w, cy), (0, 0, 255), 1)

                cv2.imwrite(
                    str(output_dir / f"{base_name}_02_landmarks.jpg"), img_annotated
                )

                # Draw ROI rectangle for lower conjunctiva
                img_roi = image.copy()
                for eye_side, iris_idx, lower_inds in [
                    ("left", 468, self.left_lower_lid_indices),
                    ("right", 473, self.right_lower_lid_indices),
                ]:
                    if num_landmarks >= 478:
                        iris_lm = landmarks.landmark[iris_idx]
                        iy = int(iris_lm.y * h)

                        pts = []
                        for idx in lower_inds:
                            lm = landmarks.landmark[idx]
                            pts.append([int(lm.x * w), int(lm.y * h)])
                        pts = np.array(pts)

                        roi_top = iy
                        roi_bottom = pts[:, 1].max() + int((pts[:, 1].max() - iy) * 0.4)
                        roi_left = pts[:, 0].min() - 5
                        roi_right = pts[:, 0].max() + 5

                        # Draw ROI rectangle (GREEN = lower conjunctiva region)
                        cv2.rectangle(
                            img_roi,
                            (roi_left, roi_top),
                            (roi_right, roi_bottom),
                            (0, 255, 0),
                            2,
                        )
                        cv2.putText(
                            img_roi,
                            f"{eye_side} conj",
                            (roi_left, roi_top - 5),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            (0, 255, 0),
                            1,
                        )

                cv2.imwrite(
                    str(output_dir / f"{base_name}_03_roi_rectangles.jpg"), img_roi
                )

                # Test iris-based extraction
                result_iris = self._extract_below_iris(image, "left")
                if result_iris is not None:
                    cv2.imwrite(
                        str(output_dir / f"{base_name}_04_iris_extraction.jpg"),
                        result_iris,
                    )
                    print("  Iris-based extraction: SUCCESS")
                else:
                    print("  Iris-based extraction: FAILED")

                # Test lower-lid polygon
                result_poly = self._extract_lower_lid_polygon(image, "left")
                if result_poly is not None:
                    cv2.imwrite(
                        str(output_dir / f"{base_name}_05_polygon_extraction.jpg"),
                        result_poly,
                    )
                    print("  Lower-lid polygon: SUCCESS")
                else:
                    print("  Lower-lid polygon: FAILED")
            else:
                print("  MediaPipe: NO face detected")
        except Exception as e:
            print(f"  MediaPipe: ERROR ({e})")

        # --- Test Haar cascade ---
        try:
            result_haar = self._extract_lower_with_haar(image)
            if result_haar is not None:
                cv2.imwrite(
                    str(output_dir / f"{base_name}_06_haar_result.jpg"), result_haar
                )
                print("  Haar cascade: SUCCESS")
            else:
                print("  Haar cascade: FAILED")
        except Exception as e:
            print(f"  Haar cascade: ERROR ({e})")

        # --- Test edge detection ---
        try:
            result_edge = self._extract_lower_with_edges(image)
            if result_edge is not None:
                cv2.imwrite(
                    str(output_dir / f"{base_name}_07_edge_result.jpg"), result_edge
                )
                print("  Edge detection: SUCCESS")
            else:
                print("  Edge detection: FAILED")
        except Exception as e:
            print(f"  Edge detection: ERROR ({e})")

        # --- Full pipeline result ---
        final = self.extract_lower_conjunctiva(image, "left")
        if final is not None:
            cv2.imwrite(str(output_dir / f"{base_name}_08_pipeline_final.jpg"), final)
            gray_final = cv2.cvtColor(final, cv2.COLOR_BGR2GRAY)
            coverage = np.sum(gray_final > 10) / (64 * 64) * 100
            print(f"  Pipeline final coverage: {coverage:.1f}%")

        print(f"  Debug images saved to: {output_dir}")
        print(f"{'='*60}\n")
        return str(output_dir)

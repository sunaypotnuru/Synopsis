"""
enhancer.py - APPLY ENHANCEMENT ONLY TO TISSUE REGION
Modified to preserve black background
"""

import cv2
import numpy as np


class MedicalEnhancer:
    """
    Medical-grade image enhancer
    APPLIES ONLY TO TISSUE - preserves black background
    """

    def __init__(self, clip_limit=2.0, tile_grid_size=(8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def enhance(self, image):
        """
        Enhance ONLY the tissue region
        Black background (0,0,0) remains unchanged
        """
        if image is None:
            return None

        # Create mask of non-black pixels (tissue region)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        tissue_mask = gray > 10  # Pixels brighter than near-black

        if not np.any(tissue_mask):
            return image  # No tissue to enhance

        # Convert to LAB
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Apply CLAHE only to tissue region in L-channel
        l_enhanced = l_channel.copy()
        l_enhanced[tissue_mask] = self.clahe.apply(l_channel)[tissue_mask]

        # Merge and convert back
        lab_enhanced = cv2.merge((l_enhanced, a_channel, b_channel))
        enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)

        # Ensure background stays black
        enhanced[~tissue_mask] = 0

        return enhanced

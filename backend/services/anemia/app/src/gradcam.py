"""
gradcam.py - GradCAM heatmap generation
Output: Overlay image only (as per your decision)
Path: src/gradcam.py
"""

import tensorflow as tf
import numpy as np
import cv2
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent))
from config import LAST_CONV_LAYER, GRADCAM_DIR


class GradCAM:
    """
    GradCAM heatmap generator
    Returns ONLY overlay image (no 3-panel figures)
    """

    def __init__(self, model, layer_name=None):
        """
        Args:
            model: Frozen Keras model
            layer_name: Name of last conv layer (from config)
        """
        self.model = model
        self.layer_name = layer_name or LAST_CONV_LAYER

        # Verify layer exists
        self.conv_layer = None
        for layer in self.model.layers:
            if layer.name == self.layer_name:
                self.conv_layer = layer
                break

        # Fallback: find last Conv2D layer
        if self.conv_layer is None:
            for layer in reversed(self.model.layers):
                if "conv" in layer.name.lower():
                    self.conv_layer = layer
                    self.layer_name = layer.name
                    break

        print(f"GradCAM using layer: {self.layer_name}")

        # Create gradient model
        self.grad_model = tf.keras.models.Model(
            inputs=[self.model.inputs],
            outputs=[self.conv_layer.output, self.model.output],
        )

    def generate_heatmap(self, image, class_idx=None):
        """
        Generate GradCAM heatmap

        Args:
            image: Preprocessed image (1,64,64,3)
            class_idx: 0 for Non-Anemic, 1 for Anemic (None = predicted class)

        Returns:
            heatmap: Raw heatmap array
        """
        # Ensure image has batch dimension
        if len(image.shape) == 3:
            image = np.expand_dims(image, axis=0)

        with tf.GradientTape() as tape:
            conv_output, predictions = self.grad_model(image)

            # Binary model output shape is (batch, 1)
            # predictions[0][0] is probability of Class 1 (Anemic)
            prob = predictions[0][0]

            if class_idx is None:
                class_idx = 1 if prob > 0.5 else 0

            # For binary classification with 1 output node:
            # If class_idx == 1 (Anemic), maximize output
            # If class_idx == 0 (Non-Anemic), maximize (1 - output)
            if class_idx == 1:
                loss = predictions[:, 0]
            else:
                loss = 1 - predictions[:, 0]

        # Calculate gradients
        grads = tape.gradient(loss, conv_output)

        # Global average pooling
        pooled_grads = tf.reduce_mean(grads, axis=(1, 2))

        # Weight conv outputs
        conv_output = conv_output[0]
        pooled_grads = pooled_grads[0]

        # Vectorized multiplication (broadcasting)
        conv_output = conv_output * pooled_grads

        # Create heatmap

        heatmap = np.mean(conv_output, axis=-1)
        heatmap = np.maximum(heatmap, 0)
        heatmap /= np.max(heatmap) if np.max(heatmap) > 0 else 1

        return heatmap

    def overlay_heatmap(self, image, heatmap, alpha=0.4):
        """
        Overlay heatmap on original image

        Args:
            image: Original image (64,64,3) - RGB
            heatmap: GradCAM heatmap
            alpha: Transparency

        Returns:
            Overlayed image (RGB) - THIS IS THE ONLY OUTPUT
        """
        # Resize heatmap to image size
        heatmap_resized = cv2.resize(heatmap, (image.shape[1], image.shape[0]))

        # Convert to RGB heatmap
        heatmap_colored = cv2.applyColorMap(
            np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET
        )
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Superimpose
        overlayed = cv2.addWeighted(image, 1 - alpha, heatmap_colored, alpha, 0)

        return overlayed

    def generate_overlay(self, image, original_image, save=False, save_path=None):
        """
        Generate and return overlay image
        This is the main function to call

        Args:
            image: Preprocessed image (1,64,64,3)
            original_image: Original RGB image (64,64,3)
            save: Whether to save to disk
            save_path: Path to save (if save=True)

        Returns:
            overlay: RGB overlay image
        """
        heatmap = self.generate_heatmap(image)
        overlay = self.overlay_heatmap(original_image, heatmap)

        if save and save_path:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(save_path), cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
            print(f"Heatmap saved: {save_path}")

        return overlay


def test_gradcam(model, image_path, save_heatmap=False):
    """Test function"""
    from tensorflow.keras.preprocessing import image as keras_image

    # Load and preprocess
    img = keras_image.load_img(image_path, target_size=(64, 64))
    img_array = keras_image.img_to_array(img) / 255.0
    img_batch = np.expand_dims(img_array, axis=0)

    # Get prediction
    prob = model.predict(img_batch, verbose=0)[0][0]
    class_name = "Anemic" if prob > 0.5 else "Non-Anemic"

    # Generate GradCAM overlay
    gradcam = GradCAM(model)
    overlay = gradcam.generate_overlay(
        img_batch,
        np.array(img),
        save=save_heatmap,
        save_path=GRADCAM_DIR / "gradcam_test.png",
    )

    print("GradCAM overlay generated")
    print(f"   Shape: {overlay.shape}")
    print(f"   Prediction: {class_name} ({prob:.4f})")

    return overlay

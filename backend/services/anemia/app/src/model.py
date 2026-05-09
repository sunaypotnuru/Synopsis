"""
NetraAI - Enhanced CNN Model (Fixed Architecture)
"""

import tensorflow as tf
from tensorflow.keras import layers, Model


def create_enhanced_model():
    """Enhanced model with proper architecture for 96% accuracy"""

    inputs = tf.keras.Input(shape=(64, 64, 3))

    # Block 1 - 32 filters
    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Conv2D(32, (3, 3), padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D(2, 2)(x)
    x = layers.Dropout(0.25)(x)

    # Block 2 - 64 filters
    x = layers.Conv2D(64, (3, 3), padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Conv2D(64, (3, 3), padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D(2, 2)(x)
    x = layers.Dropout(0.25)(x)

    # Block 3 - 128 filters
    x = layers.Conv2D(128, (3, 3), padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Conv2D(128, (3, 3), padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D(2, 2)(x)
    x = layers.Dropout(0.25)(x)

    # Classifier
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = Model(inputs=inputs, outputs=outputs)

    print(f"✅ Enhanced model created with {model.count_params():,} parameters")
    return model


# Also keep original for comparison
def create_simple_model():
    """Original simple CNN from GitHub"""
    inputs = tf.keras.Input(shape=(64, 64, 3))

    x = layers.Conv2D(32, (2, 2), padding="same", activation="relu")(inputs)
    x = layers.MaxPooling2D(2, 2)(x)

    x = layers.Conv2D(64, (2, 2), padding="same", activation="relu")(x)
    x = layers.MaxPooling2D(2, 2)(x)

    x = layers.Conv2D(128, (2, 2), padding="same", activation="relu")(x)
    x = layers.MaxPooling2D(2, 2)(x)

    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(100, activation="relu")(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = Model(inputs, outputs)
    return model

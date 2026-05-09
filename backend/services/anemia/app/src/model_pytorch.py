"""
NetraAI - PyTorch CNN Model for Anemia Detection
Converted from TensorFlow implementation
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class EnhancedAnemiaNet(nn.Module):
    """Enhanced CNN model with proper architecture for 96% accuracy"""

    def __init__(self):
        super(EnhancedAnemiaNet, self).__init__()

        # Block 1 - 32 filters
        self.conv1_1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1_1 = nn.BatchNorm2d(32)
        self.conv1_2 = nn.Conv2d(32, 32, kernel_size=3, padding=1)
        self.bn1_2 = nn.BatchNorm2d(32)
        self.pool1 = nn.MaxPool2d(2, 2)
        self.dropout1 = nn.Dropout2d(0.25)

        # Block 2 - 64 filters
        self.conv2_1 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2_1 = nn.BatchNorm2d(64)
        self.conv2_2 = nn.Conv2d(64, 64, kernel_size=3, padding=1)
        self.bn2_2 = nn.BatchNorm2d(64)
        self.pool2 = nn.MaxPool2d(2, 2)
        self.dropout2 = nn.Dropout2d(0.25)

        # Block 3 - 128 filters
        self.conv3_1 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3_1 = nn.BatchNorm2d(128)
        self.conv3_2 = nn.Conv2d(128, 128, kernel_size=3, padding=1)
        self.bn3_2 = nn.BatchNorm2d(128)
        self.pool3 = nn.MaxPool2d(2, 2)
        self.dropout3 = nn.Dropout2d(0.25)

        # Global Average Pooling is handled in forward()

        # Classifier
        self.fc1 = nn.Linear(128, 256)
        self.bn_fc1 = nn.BatchNorm1d(256)
        self.dropout_fc1 = nn.Dropout(0.5)

        self.fc2 = nn.Linear(256, 128)
        self.bn_fc2 = nn.BatchNorm1d(128)
        self.dropout_fc2 = nn.Dropout(0.3)

        self.fc3 = nn.Linear(128, 1)

    def forward(self, x):
        # Block 1
        x = F.relu(self.bn1_1(self.conv1_1(x)))
        x = F.relu(self.bn1_2(self.conv1_2(x)))
        x = self.pool1(x)
        x = self.dropout1(x)

        # Block 2
        x = F.relu(self.bn2_1(self.conv2_1(x)))
        x = F.relu(self.bn2_2(self.conv2_2(x)))
        x = self.pool2(x)
        x = self.dropout2(x)

        # Block 3
        x = F.relu(self.bn3_1(self.conv3_1(x)))
        x = F.relu(self.bn3_2(self.conv3_2(x)))
        x = self.pool3(x)
        x = self.dropout3(x)

        # Global Average Pooling
        x = F.adaptive_avg_pool2d(x, (1, 1))
        x = x.view(x.size(0), -1)

        # Classifier
        x = F.relu(self.bn_fc1(self.fc1(x)))
        x = self.dropout_fc1(x)

        x = F.relu(self.bn_fc2(self.fc2(x)))
        x = self.dropout_fc2(x)

        x = torch.sigmoid(self.fc3(x))

        return x

    def count_parameters(self):
        """Count total trainable parameters"""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


class SimpleAnemiaNet(nn.Module):
    """Original simple CNN from GitHub (PyTorch version)"""

    def __init__(self):
        super(SimpleAnemiaNet, self).__init__()

        self.conv1 = nn.Conv2d(3, 32, kernel_size=2, padding=1)
        self.pool1 = nn.MaxPool2d(2, 2)

        self.conv2 = nn.Conv2d(32, 64, kernel_size=2, padding=1)
        self.pool2 = nn.MaxPool2d(2, 2)

        self.conv3 = nn.Conv2d(64, 128, kernel_size=2, padding=1)
        self.pool3 = nn.MaxPool2d(2, 2)

        self.fc1 = nn.Linear(128, 100)
        self.fc2 = nn.Linear(100, 1)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = self.pool1(x)

        x = F.relu(self.conv2(x))
        x = self.pool2(x)

        x = F.relu(self.conv3(x))
        x = self.pool3(x)

        # Global Average Pooling
        x = F.adaptive_avg_pool2d(x, (1, 1))
        x = x.view(x.size(0), -1)

        x = F.relu(self.fc1(x))
        x = torch.sigmoid(self.fc2(x))

        return x

    def count_parameters(self):
        """Count total trainable parameters"""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def create_enhanced_model():
    """Create enhanced PyTorch model"""
    model = EnhancedAnemiaNet()
    print(
        f"✅ Enhanced PyTorch model created with {model.count_parameters():,} parameters"
    )
    return model


def create_simple_model():
    """Create simple PyTorch model"""
    model = SimpleAnemiaNet()
    print(
        f"✅ Simple PyTorch model created with {model.count_parameters():,} parameters"
    )
    return model


if __name__ == "__main__":
    # Test model creation
    print("Testing Enhanced Model:")
    model = create_enhanced_model()

    # Test forward pass
    dummy_input = torch.randn(1, 3, 64, 64)
    output = model(dummy_input)
    print(f"Output shape: {output.shape}")
    print(f"Output value: {output.item():.4f}")

    print("\nTesting Simple Model:")
    simple_model = create_simple_model()
    output = simple_model(dummy_input)
    print(f"Output shape: {output.shape}")
    print(f"Output value: {output.item():.4f}")

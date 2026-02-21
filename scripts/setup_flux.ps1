# Sidetrack Setup Script
Write-Host "Installing Sidetrack Dependencies..." -ForegroundColor Cyan

# Install Expo packages
npx expo install expo-blur expo-linear-gradient expo-font @expo-google-fonts/outfit @expo-google-fonts/dm-sans expo-haptics

# Install core logic packages
npm install lucide-react-native axios @react-native-async-storage/async-storage

Write-Host "Installation Complete! Sidetrack is ready to build." -ForegroundColor Green

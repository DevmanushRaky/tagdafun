# Tagda Fun 🎲

A fun, offline-first React Native mobile application built with Expo SDK 52 that generates random numbers and picks random names from user-provided lists. Perfect for decision-making, games, and random selections!

## ✨ Features

### 🎲 **Number Generator**
- Generate random numbers within custom ranges (1-100)
- Set your own minimum and maximum values
- Real-time validation with helpful error messages
- Reset to default range (1-100) with one tap
- Animated number generation with loading spinner

### 👥 **Name Picker**
- Enter multiple names separated by commas
- Randomly select one name from the list
- Perfect for choosing who goes first, picking teams, or making decisions
- Clear all names with one tap
- Animated name selection with loading spinner

### 🎨 **Modern UI/UX**
- **Dual Tab Interface**: Switch between Number Generator and Name Picker
- **Smooth Animations**: Tab indicator slides smoothly between sections
- **Custom Modals**: Branded alert dialogs and result displays
- **Consistent Design**: Orange primary theme with navy blue accents
- **Responsive Layout**: Works perfectly on all screen sizes
- **Loading States**: Inline spinners for better user experience

### 🔒 **Privacy-First**
- **100% Offline**: No internet connection required
- **No Data Collection**: Zero personal information stored
- **Local Processing**: All random generation happens on your device
- **No Analytics**: No tracking or usage monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo Go app on your mobile device

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tagdafun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start    or npx expo start --tunnel
   ```

4. **Run on your device**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `a` for Android emulator or `i` for iOS simulator

## 📱 App Structure

```
tagdafun/
├── App.tsx                 # Main app entry point with navigation
├── screens/
│   ├── HomeScreen.tsx      # Main screen with Number & Name features
│   └── PrivacyScreen.tsx   # Privacy policy display
├── components/
│   ├── CustomModal.tsx     # Alert and warning modals
│   └── ResultModal.tsx     # Result display modal
├── types/
│   ├── index.ts           # TypeScript type definitions
│   └── images.d.ts        # Image module declarations
├── assets/
│   └── tagdafun-main-logo.png  # App logo and icons
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── babel.config.js        # Babel configuration with path aliases
├── README.md              # This file
└── PRIVACY_POLICY.md      # Privacy policy document
```

## 🎯 How to Use

### **Number Generator**
1. Tap the "🎲 Number" tab
2. Enter your desired minimum and maximum values
3. Tap "Generate Number" to get a random number
4. View the result in a beautiful modal
5. Use "Reset to Default" to return to 1-100 range

### **Name Picker**
1. Tap the "👥 Names" tab
2. Enter names separated by commas (e.g., "John, Jane, Mike, Sarah")
3. Tap "Pick a Name" to randomly select one
4. View the chosen name in a beautiful modal
5. Use "Clear All Names" to start fresh

## 🎨 Design System

### **Color Palette**
- **Primary**: `#FF6B00` (Orange)
- **Secondary**: `#002244` (Navy Blue)
- **Background**: `#FFFFFF` (White)
- **Surface**: `#F8F9FA` (Light Gray)
- **Text**: `#1A1A1A` (Dark Gray)

### **Typography**
- **Headers**: Bold, 24-32px
- **Body**: Regular, 16px
- **Captions**: Regular, 14px
- **Buttons**: Bold, 18px

## 🔧 Development

### **TypeScript Benefits**
- **Type Safety**: Catch errors at compile time
- **Better IntelliSense**: Enhanced code completion
- **Refactoring Support**: Safe code modifications
- **Documentation**: Types serve as inline documentation

### **Path Aliases**
The project uses custom path aliases for cleaner imports:
- `@/` → Root directory
- `@assets/` → Assets directory
- `@screens/` → Screen components
- `@components/` → Reusable components
- `@types/` → TypeScript definitions

### **Available Scripts**
```bash
npm start          # Start Expo development server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run web        # Run in web browser
npm run ts:check   # TypeScript type checking
```

## 📸 Screenshots

### **Home Screen - Number Generator**
- Clean tab navigation with animated indicator
- Input fields for custom range (1-100)
- Generate button with inline loading spinner
- Reset to default functionality

### **Home Screen - Name Picker**
- Multi-line text input for names
- Comma-separated name entry
- Pick button with inline loading spinner
- Clear all names functionality

### **Result Modals**
- Beautiful animated result display
- Different styles for numbers vs names
- Action buttons (Awesome!, Try Again)
- Badge showing range or name count

### **Custom Alerts**
- Branded modal design
- Different types: Error, Warning, Info
- Smooth animations
- Consistent with app theme

## 🚀 Deployment

### **Google Play Store Ready**
- Privacy policy included
- No data collection
- Offline functionality
- Professional UI/UX
- TypeScript for maintainability

### **Build Commands**
```bash
# For production build
npx expo build:android
npx expo build:ios

# For EAS Build (recommended)
npx eas build --platform android
npx eas build --platform ios
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or support, please refer to the privacy policy contact information in `PRIVACY_POLICY.md`.

---

**Tagda Fun** - Making random decisions fun and easy! 🎲✨ 
# 📦 Netra AI Component Library

Welcome to the Netra AI component library! This directory contains all reusable components organized by purpose and functionality.

## 📁 Directory Structure

```
src/components/
├── ui/                  # UI Primitives (shadcn/ui + animated variants)
├── features/            # Feature-specific components
│   ├── accessibility/   # Accessibility components
│   ├── ai/              # AI-related components
│   ├── analytics/       # Analytics & charts
│   ├── auth/            # Authentication components
│   ├── compliance/      # Compliance & regulatory
│   ├── domain/          # Domain-specific business logic
│   ├── figma/           # Figma integration
│   ├── messaging/       # Chat & messaging
│   └── video/           # Video & voice components
├── layout/              # Layout components (Header, Footer, etc.)
├── shared/              # Shared utility components
└── README.md            # This file
```

## 🎨 UI Components (`ui/`)

Base UI primitives from shadcn/ui and their animated variants. These are the building blocks for all other components.

### Usage

```tsx
import { Button, Card, Dialog } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  );
}
```

### Available Components

**Base Components:**
- `accordion` - Collapsible content sections
- `alert` - Alert messages and notifications
- `alert-dialog` - Modal dialogs for confirmations
- `avatar` - User avatars with fallbacks
- `badge` - Status badges and labels
- `button` - Buttons with variants
- `calendar` - Date picker calendar
- `card` - Content cards
- `checkbox` - Checkboxes with labels
- `command` - Command palette
- `dialog` - Modal dialogs
- `dropdown-menu` - Dropdown menus
- `form` - Form components
- `input` - Text inputs
- `label` - Form labels
- `popover` - Popover tooltips
- `progress` - Progress bars
- `radio-group` - Radio button groups
- `select` - Select dropdowns
- `separator` - Visual separators
- `sheet` - Side sheets/drawers
- `skeleton` - Loading skeletons
- `slider` - Range sliders
- `switch` - Toggle switches
- `table` - Data tables
- `tabs` - Tab navigation
- `textarea` - Multi-line text inputs
- `tooltip` - Hover tooltips

**Animated Variants:**
- `animated-accordion` - Accordion with animations
- `animated-button` - Button with hover/click animations
- `animated-card` - Card with entrance animations
- `animated-checkbox` - Checkbox with check animation
- `animated-drawer` - Drawer with slide animations
- `animated-dropdown` - Dropdown with fade animations
- `animated-input` - Input with focus animations
- `animated-modal` - Modal with entrance/exit animations
- `animated-page-transition` - Page transition wrapper
- `animated-progress` - Progress bar with animations
- `animated-skeleton` - Skeleton with shimmer effect
- `animated-switch` - Switch with toggle animation
- `animated-tabs` - Tabs with transition animations
- `animated-toast` - Toast notifications with animations
- `animated-tooltip` - Tooltip with fade animations

## 🎯 Feature Components (`features/`)

Domain-specific components organized by feature area.

### Accessibility (`features/accessibility/`)

Components for enhanced accessibility and WCAG compliance.

```tsx
import { AccessibleButton, VoiceAccessibility } from '@/components/features/accessibility';
```

**Components:**
- `AccessibilityWidget` - Global accessibility controls
- `AccessibleClickable` - Accessible clickable elements
- `AccessibleFormInput` - Accessible form inputs
- `AccessibleFormSelect` - Accessible select dropdowns
- `AccessibleFormTextarea` - Accessible textareas
- `VoiceAccessibility` - Voice control interface

### AI (`features/ai/`)

AI-powered components for intelligent features.

```tsx
import { AIAssistantWidget, XAIVisualizer } from '@/components/features/ai';
```

**Components:**
- `AIAssistantWidget` - AI assistant chat interface
- `AILogicBreakdown` - Explainable AI logic display
- `XAIVisualizer` - Visual AI explanation tool
- `XAIVisualizationPanel` - Detailed AI visualization
- `ChatbotWidget` - Chatbot interface
- `FloatingChatbot` - Floating chat button
- `ScribePanel` - AI medical scribe

### Analytics (`features/analytics/`)

Analytics dashboards and charts.

```tsx
import { AnalyticsDashboard, FDAApmChart } from '@/components/features/analytics';
```

**Components:**
- `AnalyticsDashboard` - Main analytics dashboard
- `FDAApmChart` - FDA APM compliance charts

### Auth (`features/auth/`)

Authentication and security components.

```tsx
import { MFASetup, MFALogin } from '@/components/features/auth';
```

**Components:**
- `MFAEnforcement` - Multi-factor authentication enforcement
- `MFALogin` - MFA login flow
- `MFASetup` - MFA setup wizard

### Compliance (`features/compliance/`)

Regulatory compliance and audit components.

```tsx
import { ComplianceScoreCard, SOC2ControlCard } from '@/components/features/compliance';
```

**Components:**
- `ComplianceAlert` - Compliance alerts and warnings
- `ComplianceScoreCard` - Compliance score display
- `SOC2ControlCard` - SOC2 control status
- `TraceabilityMatrix` - IEC 62304 traceability

### Domain (`features/domain/`)

Business domain-specific components.

```tsx
import { PrescriptionPad, DashboardGridLayout } from '@/components/features/domain';
```

**Components:**
- `AdminLayoutWrapper` - Admin portal layout
- `AdminRoute` - Admin route protection
- `ProtectedRoute` - General route protection
- `DashboardGridLayout` - Dashboard grid system
- `FamilyProfileSwitcher` - Family member switcher
- `PrescriptionPad` - Digital prescription pad
- `PrescriptionSummary` - Prescription summary view
- `ClinicalReportGenerator` - Clinical report builder
- `DrugAutocomplete` - Drug name autocomplete
- `SOAPEditor` - SOAP notes editor
- `Whiteboard` - Collaborative whiteboard
- `UploadSection` - File upload interface
- `ResultCard` - Test result card
- `BadgeDisplay` - Achievement badges
- `StreakDisplay` - Streak counter
- `ChallengeCard` - Health challenge card
- `AnimatedCounter` - Animated number counter
- `LiveAuditLog` - Real-time audit log

### Messaging (`features/messaging/`)

Chat and messaging components.

```tsx
import { MessageBubble, MessageInput } from '@/components/features/messaging';
```

**Components:**
- `MessageBubble` - Chat message bubble
- `MessageInput` - Message input field
- `EmojiPicker` - Emoji picker widget

### Video (`features/video/`)

Video call and recording components.

```tsx
import { VideoPlayer, VideoRecorder } from '@/components/features/video';
```

**Components:**
- `VideoPlayer` - Video playback player
- `VideoRecorder` - Video recording interface
- `VoiceNoteRecorder` - Voice note recorder

## 🏗️ Layout Components (`layout/`)

Page layout and structure components.

```tsx
import { Navbar, Footer, Hero } from '@/components/layout';
```

**Components:**
- `Navbar` - Main navigation bar
- `NavbarMain` - Alternative navbar
- `Footer` - Page footer
- `Hero` - Hero section
- `HeroRealistic` - Realistic hero variant
- `HeroStoryAnimation` - Animated hero story
- `AboutSection` - About section
- `ContactSection` - Contact section
- `HowItWorks` - How it works section
- `ReviewSection` - Reviews section

## 🔧 Shared Components (`shared/`)

Utility components used across the application.

```tsx
import { LoadingSpinner, ErrorBoundary } from '@/components/shared';
```

**Components:**
- `ErrorBoundary` - Error boundary wrapper
- `ErrorMessage` - Error message display
- `LoadingSpinner` - Loading spinner
- `PageLoadingSkeleton` - Page loading skeleton
- `PageTransition` - Page transition wrapper
- `ThemeToggle` - Dark/light mode toggle
- `LanguageSwitcher` - Language selector
- `GlobalSearch` - Global search interface
- `CommandPalette` - Command palette (Cmd+K)
- `AdvancedSearchModal` - Advanced search modal
- `Breadcrumb` - Breadcrumb navigation
- `ExportDialog` - Data export dialog
- `DocumentShareModal` - Document sharing modal
- `InstallPrompt` - PWA install prompt
- `WakeUpButton` - Wake up/activate button
- `SOSButton` - Emergency SOS button
- `AmbientBackground` - Ambient background effect
- `FuturisticBackground` - Futuristic background
- `PortalHeroOverlay` - Portal hero overlay
- `RevealOnScroll` - Scroll reveal animation

## 📖 Usage Guidelines

### Import Best Practices

**✅ DO:**
```tsx
// Import from category index
import { Button, Card } from '@/components/ui';
import { AIAssistantWidget } from '@/components/features/ai';
import { Navbar } from '@/components/layout';
```

**❌ DON'T:**
```tsx
// Don't import from deep paths
import { Button } from '@/components/ui/button';
import { AIAssistantWidget } from '@/components/features/ai/AIAssistantWidget';
```

### Component Composition

Build complex UIs by composing simple components:

```tsx
import { Card, Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/shared';

function MyFeature() {
  const [loading, setLoading] = useState(false);
  
  return (
    <Card>
      <h2>My Feature</h2>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Button onClick={() => setLoading(true)}>
          Load Data
        </Button>
      )}
    </Card>
  );
}
```

### Accessibility

All components follow WCAG 2.1 AA standards:
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA attributes
- Color contrast compliance

### Animations

Use animated variants for enhanced UX:

```tsx
import { AnimatedCard, AnimatedButton } from '@/components/ui';

function AnimatedFeature() {
  return (
    <AnimatedCard>
      <AnimatedButton>Click me</AnimatedButton>
    </AnimatedCard>
  );
}
```

All animations respect `prefers-reduced-motion` for accessibility.

### Theming

Components support light/dark themes automatically:

```tsx
import { ThemeToggle } from '@/components/shared';

function App() {
  return (
    <div>
      <ThemeToggle />
      {/* Your app */}
    </div>
  );
}
```

## 🧪 Testing

### Unit Tests

Test components in isolation:

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui';

test('renders button', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### Integration Tests

Test component interactions:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, Button } from '@/components/ui';

test('opens dialog on button click', () => {
  render(
    <Dialog>
      <Button>Open</Button>
      <Dialog.Content>Dialog content</Dialog.Content>
    </Dialog>
  );
  
  fireEvent.click(screen.getByText('Open'));
  expect(screen.getByText('Dialog content')).toBeVisible();
});
```

## 📚 Documentation

Each component category has its own README:
- [UI Components](./ui/README.md)
- [Feature Components](./features/README.md)
- [Layout Components](./layout/README.md)
- [Shared Components](./shared/README.md)

## 🤝 Contributing

### Adding New Components

1. **Choose the right category:**
   - UI primitive? → `ui/`
   - Feature-specific? → `features/[category]/`
   - Layout? → `layout/`
   - Utility? → `shared/`

2. **Create the component:**
   ```tsx
   // src/components/ui/my-component.tsx
   export function MyComponent() {
     return <div>My Component</div>;
   }
   ```

3. **Export from index:**
   ```tsx
   // src/components/ui/index.ts
   export * from './my-component';
   ```

4. **Add documentation:**
   - Update category README
   - Add usage examples
   - Document props

5. **Write tests:**
   - Unit tests for logic
   - Integration tests for interactions
   - Accessibility tests

### Component Checklist

- [ ] TypeScript types defined
- [ ] Accessibility compliant (WCAG 2.1 AA)
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Animation support (with reduced motion)
- [ ] Unit tests written
- [ ] Documentation added
- [ ] Storybook story created (if applicable)

## 🔗 Related Documentation

- [Animation System](../animations/README.md)
- [Styling Guide](../styles/README.md)
- [Accessibility Guide](../docs/accessibility.md)
- [Testing Guide](../docs/testing.md)

## 📞 Support

For questions or issues:
- Check component documentation
- Review usage examples
- Ask in team chat
- Create an issue

---

**Last Updated:** May 9, 2026  
**Maintainer:** Netra AI Development Team

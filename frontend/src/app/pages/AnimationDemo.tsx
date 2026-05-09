/**
 * Animation Demo Page
 * 
 * Showcases all animated components and micro-interactions.
 * Useful for testing and demonstrating the animation system.
 * 
 * Phase 1: Foundation (FadeIn, SlideIn, ScaleIn, etc.)
 * Phase 2: Micro-interactions (Buttons, Forms, Cards, etc.)
 * Phase 3: Page Transitions (Modals, Drawers, Tooltips, etc.)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { FadeIn, SlideIn, StaggerContainer, ScrollReveal } from '@/animations';
import {
  AnimatedButton,
  AnimatedInput,
  AnimatedCheckbox,
  AnimatedSwitch,
  AnimatedCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  AnimatedTabs,
  ToastContainer,
  SkeletonCard,
  SkeletonDashboard,
  AnimatedModal,
  AnimatedDrawer,
  AnimatedTooltip,
  AnimatedDropdown,
  AnimatedAccordion,
  AnimatedProgress,
  AnimatedProgressCircular,
  AnimatedProgressSteps,
  type Toast,
  type AccordionItem,
} from '@/components/ui/animated';
import { 
  Play, 
  Settings, 
  User, 
  Bell, 
  Menu, 
  Info, 
  HelpCircle,
  FileText,
  Image,
  Video,
  Download,
  Trash2,
  Edit,
} from 'lucide-react';

export default function AnimationDemo() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  
  // Phase 3 state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<'left' | 'right' | 'top' | 'bottom'>('right');
  const [progressValue, setProgressValue] = useState(45);
  const [currentStep, setCurrentStep] = useState(2);

  const addToast = (type: Toast['type']) => {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} notification`,
      description: 'This is a sample notification message.',
      action: {
        label: 'View',
        onClick: () => console.log('Action clicked'),
      },
    };
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const validateInput = () => {
    if (!inputValue) {
      setInputError('This field is required');
    } else if (inputValue.length < 3) {
      setInputError('Must be at least 3 characters');
    } else {
      setInputError('');
    }
  };

  // Accordion items
  const accordionItems: AccordionItem[] = [
    {
      id: '1',
      title: 'What is Netra-Ai?',
      icon: <Info className="w-5 h-5" />,
      content: (
        <p>
          Netra-Ai is a comprehensive healthcare platform that uses AI to detect various
          medical conditions through eye scans and other diagnostic tools.
        </p>
      ),
    },
    {
      id: '2',
      title: 'How does it work?',
      icon: <HelpCircle className="w-5 h-5" />,
      content: (
        <p>
          Our platform uses advanced machine learning models to analyze medical images
          and provide accurate diagnoses. Simply upload your scan and receive results
          within minutes.
        </p>
      ),
    },
    {
      id: '3',
      title: 'Is it secure?',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <p>
          Yes! We follow HIPAA compliance and use end-to-end encryption to protect
          your medical data. Your privacy is our top priority.
        </p>
      ),
    },
  ];

  // Dropdown items
  const dropdownItems = [
    {
      id: '1',
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      onClick: () => console.log('Download'),
    },
    {
      id: '2',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => console.log('Edit'),
    },
    { type: 'divider' as const },
    {
      id: '3',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => console.log('Delete'),
      danger: true,
    },
  ];

  const tabs = [
    {
      id: 'components',
      label: 'Components',
      icon: <Settings className="h-4 w-4" />,
      content: (
        <div className="space-y-8">
          {/* Buttons */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <AnimatedButton>Default Button</AnimatedButton>
              <AnimatedButton variant="outline">Outline Button</AnimatedButton>
              <AnimatedButton variant="secondary">Secondary</AnimatedButton>
              <AnimatedButton variant="ghost">Ghost</AnimatedButton>
              <AnimatedButton variant="destructive">Destructive</AnimatedButton>
              <AnimatedButton loading>Loading...</AnimatedButton>
              <AnimatedButton ripple>With Ripple</AnimatedButton>
            </div>
          </section>

          {/* Form Inputs */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Form Inputs</h3>
            <div className="space-y-4 max-w-md">
              <AnimatedInput
                label="Email"
                type="email"
                placeholder="Enter your email"
                required
              />
              <AnimatedInput
                label="Password"
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={validateInput}
                error={inputError}
                helperText="Must be at least 3 characters"
              />
              <AnimatedInput
                label="Success State"
                value="Valid input"
                success
                readOnly
              />
            </div>
          </section>

          {/* Checkboxes & Switches */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Checkboxes & Switches</h3>
            <div className="space-y-4">
              <AnimatedCheckbox
                label="Accept terms and conditions"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <AnimatedSwitch
                label="Enable notifications"
                checked={isSwitchOn}
                onChange={(e) => setIsSwitchOn(e.target.checked)}
              />
              <AnimatedSwitch
                label="Small switch"
                size="sm"
                checked={isSwitchOn}
                onChange={(e) => setIsSwitchOn(e.target.checked)}
              />
              <AnimatedSwitch
                label="Large switch"
                size="lg"
                checked={isSwitchOn}
                onChange={(e) => setIsSwitchOn(e.target.checked)}
              />
            </div>
          </section>

          {/* Cards */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnimatedCard hoverable>
                <CardHeader>
                  <CardTitle>Hoverable Card</CardTitle>
                  <CardDescription>Hover to see lift effect</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card lifts up when you hover over it.
                  </p>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard clickable onClick={() => alert('Card clicked!')}>
                <CardHeader>
                  <CardTitle>Clickable Card</CardTitle>
                  <CardDescription>Click to interact</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card has a click animation.
                  </p>
                </CardContent>
              </AnimatedCard>

              <AnimatedCard>
                <CardHeader>
                  <CardTitle>Static Card</CardTitle>
                  <CardDescription>No hover effect</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card has no animations.
                  </p>
                </CardContent>
              </AnimatedCard>
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'animations',
      label: 'Animations',
      icon: <Play className="h-4 w-4" />,
      content: (
        <div className="space-y-8">
          {/* Fade In */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Fade In</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FadeIn direction="none">
                <div className="p-4 bg-muted rounded-lg text-center">
                  Fade Only
                </div>
              </FadeIn>
              <FadeIn direction="up">
                <div className="p-4 bg-muted rounded-lg text-center">
                  Fade Up
                </div>
              </FadeIn>
              <FadeIn direction="down">
                <div className="p-4 bg-muted rounded-lg text-center">
                  Fade Down
                </div>
              </FadeIn>
              <FadeIn direction="left">
                <div className="p-4 bg-muted rounded-lg text-center">
                  Fade Left
                </div>
              </FadeIn>
            </div>
          </section>

          {/* Stagger Animation */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Stagger Animation</h3>
            <StaggerContainer stagger="normal" direction="up">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 bg-muted rounded-lg text-center mb-2"
                >
                  Item {i + 1}
                </div>
              ))}
            </StaggerContainer>
          </section>

          {/* Scroll Reveal */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Scroll Reveal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scroll down to see elements animate into view
            </p>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ScrollReveal key={i} direction="up" delay={i * 0.1}>
                  <div className="p-6 bg-muted rounded-lg">
                    <h4 className="font-semibold">Scroll Item {i + 1}</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      This element animates when it enters the viewport.
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Toast Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Click buttons to trigger different types of notifications
          </p>
          <div className="flex flex-wrap gap-4">
            <AnimatedButton onClick={() => addToast('success')}>
              Success Toast
            </AnimatedButton>
            <AnimatedButton onClick={() => addToast('error')} variant="destructive">
              Error Toast
            </AnimatedButton>
            <AnimatedButton onClick={() => addToast('warning')} variant="outline">
              Warning Toast
            </AnimatedButton>
            <AnimatedButton onClick={() => addToast('info')} variant="secondary">
              Info Toast
            </AnimatedButton>
          </div>
        </div>
      ),
    },
    {
      id: 'loading',
      label: 'Loading States',
      icon: <User className="h-4 w-4" />,
      content: (
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">Skeleton Screens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4">Dashboard Skeleton</h3>
            <SkeletonDashboard />
          </section>
        </div>
      ),
    },
    {
      id: 'overlays',
      label: 'Overlays & Dialogs',
      icon: <Menu className="h-4 w-4" />,
      content: (
        <div className="space-y-8">
          {/* Modals */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Modals</h3>
            <div className="flex flex-wrap gap-4">
              <AnimatedButton onClick={() => setIsModalOpen(true)}>
                Open Modal
              </AnimatedButton>
            </div>
          </section>

          {/* Drawers */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Drawers</h3>
            <div className="flex flex-wrap gap-4">
              <AnimatedButton onClick={() => { setDrawerSide('right'); setIsDrawerOpen(true); }}>
                Right Drawer
              </AnimatedButton>
              <AnimatedButton onClick={() => { setDrawerSide('left'); setIsDrawerOpen(true); }}>
                Left Drawer
              </AnimatedButton>
              <AnimatedButton onClick={() => { setDrawerSide('top'); setIsDrawerOpen(true); }}>
                Top Drawer
              </AnimatedButton>
              <AnimatedButton onClick={() => { setDrawerSide('bottom'); setIsDrawerOpen(true); }}>
                Bottom Drawer
              </AnimatedButton>
            </div>
          </section>

          {/* Tooltips */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Tooltips</h3>
            <div className="flex flex-wrap gap-4">
              <AnimatedTooltip content="This is a tooltip on top" position="top">
                <AnimatedButton variant="outline">Hover (Top)</AnimatedButton>
              </AnimatedTooltip>
              <AnimatedTooltip content="This is a tooltip on bottom" position="bottom">
                <AnimatedButton variant="outline">Hover (Bottom)</AnimatedButton>
              </AnimatedTooltip>
              <AnimatedTooltip content="This is a tooltip on left" position="left">
                <AnimatedButton variant="outline">Hover (Left)</AnimatedButton>
              </AnimatedTooltip>
              <AnimatedTooltip content="This is a tooltip on right" position="right">
                <AnimatedButton variant="outline">Hover (Right)</AnimatedButton>
              </AnimatedTooltip>
            </div>
          </section>

          {/* Dropdowns */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Dropdown Menus</h3>
            <div className="flex flex-wrap gap-4">
              <AnimatedDropdown
                trigger={<AnimatedButton variant="outline">Actions Menu</AnimatedButton>}
                items={dropdownItems}
                align="left"
              />
              <AnimatedDropdown
                trigger={<AnimatedButton variant="outline">Right Aligned</AnimatedButton>}
                items={dropdownItems}
                align="right"
              />
            </div>
          </section>
        </div>
      ),
    },
    {
      id: 'content',
      label: 'Content',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-8">
          {/* Accordion */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Accordion</h3>
            <AnimatedAccordion items={accordionItems} />
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Multiple Open</h4>
              <AnimatedAccordion items={accordionItems} multiple defaultOpen={['1', '2']} />
            </div>
          </section>

          {/* Progress Bars */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Progress Indicators</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Linear Progress</h4>
                <div className="space-y-4">
                  <AnimatedProgress value={progressValue} showLabel />
                  <AnimatedProgress value={75} variant="success" />
                  <AnimatedProgress value={50} variant="warning" />
                  <AnimatedProgress value={25} variant="danger" />
                  <AnimatedProgress indeterminate variant="primary" />
                </div>
                <div className="mt-4">
                  <AnimatedButton 
                    onClick={() => setProgressValue(Math.min(progressValue + 10, 100))}
                    size="sm"
                  >
                    Increase Progress
                  </AnimatedButton>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Circular Progress</h4>
                <div className="flex flex-wrap gap-6">
                  <AnimatedProgressCircular value={75} size="sm" />
                  <AnimatedProgressCircular value={60} size="md" variant="success" />
                  <AnimatedProgressCircular value={45} size="lg" variant="warning" />
                  <AnimatedProgressCircular value={30} size="xl" variant="danger" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Step Progress</h4>
                <AnimatedProgressSteps
                  steps={5}
                  currentStep={currentStep}
                  labels={['Start', 'Details', 'Review', 'Payment', 'Complete']}
                />
                <div className="mt-4 flex gap-2">
                  <AnimatedButton 
                    onClick={() => setCurrentStep(Math.max(currentStep - 1, 1))}
                    size="sm"
                    disabled={currentStep === 1}
                  >
                    Previous
                  </AnimatedButton>
                  <AnimatedButton 
                    onClick={() => setCurrentStep(Math.min(currentStep + 1, 5))}
                    size="sm"
                    disabled={currentStep === 5}
                  >
                    Next
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </section>
        </div>
      ),
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Animation System Demo</h1>
            <p className="text-muted-foreground">
              Explore all animated components and micro-interactions
            </p>
          </div>
        </FadeIn>

        {/* Tabs */}
        <SlideIn direction="bottom">
          <AnimatedTabs tabs={tabs} variant="pills" />
        </SlideIn>
      </div>

      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
        position="top-right"
      />

      {/* Modal */}
      <AnimatedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        description="This is a modal dialog with smooth animations"
        footer={
          <>
            <AnimatedButton variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton onClick={() => setIsModalOpen(false)}>
              Confirm
            </AnimatedButton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            This modal demonstrates smooth enter/exit animations with backdrop fade.
            It includes focus trap, escape key handling, and ARIA attributes for accessibility.
          </p>
          <AnimatedInput label="Name" placeholder="Enter your name" />
          <AnimatedInput label="Email" type="email" placeholder="Enter your email" />
        </div>
      </AnimatedModal>

      {/* Drawer */}
      <AnimatedDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        side={drawerSide}
        title="Example Drawer"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            This drawer slides in from the {drawerSide} side with smooth animations.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium">Quick Actions</h4>
            <div className="space-y-2">
              <AnimatedButton className="w-full" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Documents
              </AnimatedButton>
              <AnimatedButton className="w-full" variant="outline">
                <Image className="w-4 h-4 mr-2" />
                View Images
              </AnimatedButton>
              <AnimatedButton className="w-full" variant="outline">
                <Video className="w-4 h-4 mr-2" />
                View Videos
              </AnimatedButton>
            </div>
          </div>
        </div>
      </AnimatedDrawer>
    </motion.div>
  );
}

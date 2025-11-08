/**
 * useToast hook - Provides toast notification functionality
 *
 * Usage:
 * ```tsx
 * import { useToast } from '@/hooks/useToast';
 *
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSuccess = () => {
 *     toast.success('Operation completed successfully!');
 *   };
 *
 *   const handleError = () => {
 *     toast.error('Something went wrong. Please try again.');
 *   };
 *
 *   const handleInfo = () => {
 *     toast.info('Here's some information for you.');
 *   };
 *
 *   const handleWarning = () => {
 *     toast.warning('Please be careful with this action.');
 *   };
 *
 *   // Custom duration (default is 5000ms)
 *   const handleCustom = () => {
 *     toast.success('This will stay for 10 seconds', 10000);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSuccess}>Show Success</button>
 *       <button onClick={handleError}>Show Error</button>
 *       <button onClick={handleInfo}>Show Info</button>
 *       <button onClick={handleWarning}>Show Warning</button>
 *     </div>
 *   );
 * }
 * ```
 */
export { useToast } from '@/contexts/ToastContext';

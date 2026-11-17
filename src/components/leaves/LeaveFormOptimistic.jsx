// Wrapper to add optimistic updates to LeaveForm
import LeaveForm from './LeaveForm';

export default function LeaveFormOptimistic({ employees, currentUser, onSubmit, onCancel, onOptimisticAdd }) {
  const handleSubmitWithOptimistic = async (data) => {
    // Add item optimistically to the list
    const optimisticItem = {
      ...data,
      id: `temp_${Date.now()}`,
      created_date: new Date().toISOString(),
      is_optimistic: true
    };
    onOptimisticAdd?.(optimisticItem);

    // Call actual submit
    try {
      await onSubmit(data);
    } catch (error) {
      // Remove optimistic item on error
      console.error('Error submitting leave:', error);
    }
  };

  return (
    <LeaveForm 
      employees={employees} 
      currentUser={currentUser} 
      onSubmit={handleSubmitWithOptimistic}
      onCancel={onCancel}
    />
  );
}
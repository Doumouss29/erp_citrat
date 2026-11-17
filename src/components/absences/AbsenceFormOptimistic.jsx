// Wrapper to add optimistic updates to AbsenceForm
import AbsenceForm from './AbsenceForm';

export default function AbsenceFormOptimistic({ employees, currentUser, onSubmit, onCancel, onOptimisticAdd }) {
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
      console.error('Error submitting absence:', error);
    }
  };

  return (
    <AbsenceForm 
      employees={employees} 
      currentUser={currentUser} 
      onSubmit={handleSubmitWithOptimistic}
      onCancel={onCancel}
    />
  );
}
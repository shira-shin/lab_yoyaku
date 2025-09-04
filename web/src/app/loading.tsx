import Spinner from '@/components/ui/Spinner';
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={48} />
    </div>
  );
}

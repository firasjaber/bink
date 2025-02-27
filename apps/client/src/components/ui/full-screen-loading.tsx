import { cn } from "@/lib/utils";
import { Link as LinkIcon } from "lucide-react";

interface FullScreenLoadingProps {
  className?: string;
}

export function FullScreenLoading({ className }: FullScreenLoadingProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col items-center justify-center bg-background",
        className
      )}
    >
      <div className='flex items-center space-x-2 opacity-10 animate-pulse'>
        <LinkIcon className='h-12 w-12' />
        <span className='text-4xl font-bold'>Bink</span>
      </div>
    </div>
  );
}

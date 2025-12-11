import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";

export default function Home() {
  return (
    <div>
      <div className="relative flex items-center justify-center h-screen dark:bg-gray-800">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>

        <Button>
          <Image width={24} height={24} className="w-6 h-6" src="https://www.svgrepo.com/show/475656/google-color.svg" loading="lazy" alt="google logo" />
          <span>Login with Google</span>
        </Button>
        
      </div>
    </div>
  );
}

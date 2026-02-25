import { cn } from "../../lib/utils";
import { FallingPattern } from "./FallingPattern";

export function GridBackground({ className, children }) {
  return (
    <FallingPattern
      className={cn("h-full w-full", className)}
      color="#1A9375" // Primary green
      backgroundColor="#f4f4f4" // surface-page
      duration={200} // Slower animation
      blurIntensity="0.8em"
      density={1}
    >
      {children}
    </FallingPattern>
  );
}

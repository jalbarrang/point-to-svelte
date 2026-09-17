import { createVariants } from "../../utils/create-variants.js";

export const buttonVariants = createVariants(
  "contain-layout shrink-0 flex items-center justify-center cursor-pointer transition-all press-scale",
  {
    variants: {
      variant: {
        chip: "px-[3px] py-px h-[17px] rounded-sm bg-[var(--sg-surface-hover)] [border-width:0.5px] border-solid border-[var(--sg-border-button)] hover:bg-[var(--sg-surface-active)] text-[var(--sg-text-primary)]",
        destructive:
          "px-[3px] py-px h-[17px] rounded-sm bg-[var(--sg-error-bg)] hover:bg-[var(--sg-error-bg-hover)] text-[var(--sg-error-text)]",
        ghost:
          "rounded-sm bg-transparent hover:bg-[var(--sg-surface-hover)] border-none outline-none p-0",
      },
    },
    defaultVariants: { variant: "chip" },
  },
);

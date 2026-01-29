import { Toaster, toast } from "sonner";

function Sonner() {
  return (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{
        className: "!rounded-2xl !shadow-[0_8px_30px_rgb(0,0,0,0.12),0_4px_12px_rgb(0,0,0,0.08)] !backdrop-blur-md !bg-white/95 !border-white/20",
        style: {
          padding: "14px 18px",
        },
      }}
    />
  );
}

export { Sonner, toast };

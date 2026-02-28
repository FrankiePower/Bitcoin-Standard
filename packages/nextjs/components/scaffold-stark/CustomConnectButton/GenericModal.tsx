import { useTheme } from "next-themes";

const GenericModal = ({
  children,
  className = "modal-box modal-border bg-modal rounded-[8px] border flex flex-col relative w-full max-w-xs p-6",
  modalId,
}: {
  children: React.ReactNode;
  className?: string;
  modalId: string;
}) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <label htmlFor={modalId} className="absolute inset-0 z-[-1] cursor-pointer" />
      <div className={className} style={{ minHeight: "auto" }}>
        {/* dummy input to capture event onclick on modal box */}
        <input className="h-0 w-0 absolute top-0 left-0" />
        {children}
      </div>
    </div>
  );
};

export default GenericModal;

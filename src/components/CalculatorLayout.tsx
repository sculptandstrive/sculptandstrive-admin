import { motion } from "framer-motion";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface CalculatorLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: Boolean;
}

const CalculatorLayout = ({ title, subtitle, children, showBack = true }: CalculatorLayoutProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-muted-foreground text-base max-w-[60ch]">
              {subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          className="mt-10 flex flex-col gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.02 } },
          }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export const StaggerItem = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    }}
  >
    {children}
  </motion.div>
);

export default CalculatorLayout;

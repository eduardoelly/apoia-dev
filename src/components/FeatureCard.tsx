import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="bg-gray-800/50 p-6 rounded-xl shadow-lg border border-gray-700/50 text-center backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/10">
      <div className="flex items-center justify-center bg-orange-500/20 rounded-full mx-auto w-14 h-14 border border-orange-500/30">
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-white mt-4">{title}</h3>
      <p className="text-gray-300 text-sm mt-2">{description}</p>
    </Card>
  );
}

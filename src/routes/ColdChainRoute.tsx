import { Thermometer } from "lucide-react";

import { ComingSoon } from "./ComingSoon";

export function ColdChainRoute() {
  return (
    <ComingSoon
      title="Cold chain"
      description="Live temperature charts, device health, and the excursion timeline."
      milestone={13}
      icon={Thermometer}
    />
  );
}

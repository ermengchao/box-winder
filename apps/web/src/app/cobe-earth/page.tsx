import { CobeEarthHorizon } from "@/components/visuals/CobeEarthHorizon";

export default function CobeEarthPage() {
  return (
    <CobeEarthHorizon className="pointer-events-none fixed bottom-[calc(75vh-100vw)] right-[-50vw] bg-background opacity-95 [filter:contrast(1.08)_saturate(1.12)] portrait:bottom-[-50vh] portrait:right-[calc(75vw-100vh)]" />
  );
}

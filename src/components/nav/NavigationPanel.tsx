import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Navigation,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  RefreshCw,
  GitMerge,
  GitFork,
  MapPin,
  Volume2,
  VolumeX,
  X,
  Loader2
} from 'lucide-react';
import type { ManeuverIcon, NavStatus, NavStep } from '@/types/navigation';
import { formatDistance, formatETA } from '@/lib/navigation';
import { PROJECT_CONFIG } from '@/config/project-config';

const MANEUVER_ICONS: Record<ManeuverIcon, LucideIcon> = {
  depart: Navigation,
  straight: ArrowUp,
  left: ArrowLeft,
  'slight-left': ArrowUpLeft,
  'sharp-left': CornerUpLeft,
  right: ArrowRight,
  'slight-right': ArrowUpRight,
  'sharp-right': CornerUpRight,
  uturn: RotateCcw,
  roundabout: RefreshCw,
  merge: GitMerge,
  fork: GitFork,
  arrive: MapPin
};

interface EtaBadgeProps {
  duration: number;
  distance: number;
}

const EtaBadge = React.memo(({ duration, distance }: EtaBadgeProps) => {
  return (
    <div className="text-right leading-tight tabular-nums">
      <div className="text-sm font-bold text-emerald-400">{formatETA(duration)}</div>
      <div className="text-[11px] text-slate-400">{formatDistance(distance)}</div>
    </div>
  );
});

EtaBadge.displayName = 'EtaBadge';

interface NavigationPanelProps {
  visible: boolean;
  status: NavStatus;
  statusMessage: string;
  upcomingStep: NavStep | null;
  distanceToNextTurn: number;
  distanceRemaining: number;
  durationRemaining: number;
  muted: boolean;
  offline: boolean;
  cacheAgeMinutes: number | null;
  onToggleMute: () => void;
  onEnd: () => void;
  onReplay: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  visible,
  status,
  statusMessage,
  upcomingStep,
  distanceToNextTurn,
  distanceRemaining,
  durationRemaining,
  muted,
  offline,
  cacheAgeMinutes,
  onToggleMute,
  onEnd,
  onReplay
}) => {
  if (!visible) return null;

  const isLoading = status === 'locating' || status === 'routing';
  const isArrived = status === 'arrived';

  const Icon = isArrived
    ? MapPin
    : upcomingStep
      ? MANEUVER_ICONS[upcomingStep.icon]
      : Navigation;

  const instruction = isArrived
    ? 'Aap pahunch gaye hain.'
    : upcomingStep
      ? upcomingStep.instruction
      : 'Manzil ki taraf chalein';

  const distanceLabel = isArrived
    ? PROJECT_CONFIG.name
    : formatDistance(upcomingStep ? distanceToNextTurn : distanceRemaining);

  const subText = !isArrived && upcomingStep?.name ? `via ${upcomingStep.name}` : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="mx-auto w-full max-w-2xl pointer-events-auto">
        {offline && (
          <div className="mb-2 flex items-center gap-1.5 bg-amber-500/95 text-slate-950 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
            Offline route
            {cacheAgeMinutes != null && (
              <span className="font-semibold opacity-80">· cached {cacheAgeMinutes} min pehle</span>
            )}
          </div>
        )}

        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-stretch">
            <div
              className={`flex items-center justify-center w-16 shrink-0 ${
                isArrived ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Icon className="w-7 h-7 text-white" />
              )}
            </div>

            <button
              onClick={onReplay}
              className="flex-1 min-w-0 text-left px-3 py-2.5 active:bg-slate-800/60 transition-colors"
              title="Instruction dobara sunein"
            >
              <div className="text-[15px] font-bold text-white truncate">
                {isLoading ? (
                  statusMessage
                ) : (
                  <>
                    <span className="text-emerald-400">{distanceLabel}</span>
                    {!isArrived && <span className="text-slate-500 mx-1.5">—</span>}
                    {!isArrived && instruction}
                  </>
                )}
              </div>
              {subText && <div className="text-[11px] text-slate-400 truncate mt-0.5">{subText}</div>}
            </button>

            <div className="flex items-center gap-1 pr-2 pl-1 shrink-0">
              {!isLoading && !isArrived && (
                <EtaBadge duration={durationRemaining} distance={distanceRemaining} />
              )}
              <button
                onClick={onToggleMute}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 active:scale-95 transition-all"
                title={muted ? 'Voice chalu karein' : 'Voice band karein'}
              >
                {muted ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {statusMessage && !isLoading && (
            <div className="px-3 pb-2 -mt-0.5 text-[11px] text-slate-400">{statusMessage}</div>
          )}
        </div>

        <div className="flex justify-center mt-2">
          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg shadow-red-900/40 transition-all duration-200 transform active:scale-95"
            title="Navigation band karein"
          >
            <X className="w-3.5 h-3.5" />
            <span>End navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

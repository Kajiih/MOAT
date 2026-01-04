import { Calendar, Disc } from 'lucide-react';
import { MediaDetails } from '@/lib/types';
import { ExternalLinks } from './ExternalLinks';

interface AlbumViewProps {
  details: MediaDetails;
}

export function AlbumView({ details }: AlbumViewProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
            {details.date && (
                <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                    <Calendar size={14} /> 
                    <span>{details.date}</span>
                </div>
            )}
            {details.label && (
                <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                    <Disc size={14} /> 
                    <span>{details.label}</span>
                </div>
            )}
        </div>

        {/* Tracklist */}
        {details.tracks && details.tracks.length > 0 && (
            <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Disc size={18} className="text-blue-500" /> Tracklist
                </h3>
                <div className="bg-neutral-800/30 rounded-lg border border-neutral-800 overflow-hidden divide-y divide-neutral-800">
                    {details.tracks.map((track) => (
                        <div key={track.id} className="flex items-center px-4 py-3 hover:bg-neutral-800/50 transition-colors">
                            <span className="w-8 text-neutral-500 font-mono text-xs">{track.position}</span>
                            <span className="flex-1 text-sm font-medium text-neutral-200">{track.title}</span>
                            <span className="text-xs text-neutral-500 font-mono">{track.length}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <ExternalLinks mbId={details.id} type="album" urls={details.urls} />
    </div>
  );
}

import { Disc } from 'lucide-react';
import { MediaDetails } from '@/lib/types';
import { ExternalLinks } from './ExternalLinks';

interface SongViewProps {
  details: MediaDetails;
}

export function SongView({ details }: SongViewProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
        
        {/* Album Info */}
        {details.album && (
             <div className="flex items-center gap-2 text-sm text-neutral-300 bg-neutral-800/50 p-3 rounded-lg border border-neutral-800">
                <Disc size={16} className="text-blue-400" />
                <span>From album: <strong className="text-white">{details.album}</strong></span>
            </div>
        )}

        {/* Tags */}
        {details.tags && details.tags.length > 0 && (
            <div>
                <h3 className="text-sm font-bold text-neutral-500 uppercase mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                    {details.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-900/20 text-blue-300 border border-blue-900/30 rounded text-xs">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        )}

        <ExternalLinks mbId={details.id} type="song" urls={details.urls} />
    </div>
  );
}

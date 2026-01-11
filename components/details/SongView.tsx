import { Disc, Clock, ExternalLink } from 'lucide-react';
import { MediaDetails } from '@/lib/types';
import { ExternalLinks } from './ExternalLinks';

interface SongViewProps {
  details: MediaDetails;
}

export function SongView({ details }: SongViewProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
        
        {/* Metadata */}
        {details.length && (
            <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                <div className="flex items-center gap-1.5 bg-neutral-800 px-3 py-1.5 rounded-full">
                    <Clock size={14} className="text-green-400" /> 
                    <span>{details.length}</span>
                </div>
            </div>
        )}

        {/* Album Info */}
        {details.album && (
             <div className="flex items-center gap-2 text-sm text-neutral-300 bg-neutral-800/50 p-3 rounded-lg border border-neutral-800">
                <Disc size={16} className="text-blue-400" />
                <span className="flex items-center gap-1.5 flex-wrap">
                    From album: 
                    {details.albumId ? (
                        <a 
                            href={`https://musicbrainz.org/release-group/${details.albumId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-blue-400 transition-colors font-bold flex items-center gap-1 group"
                            title="View album on MusicBrainz"
                        >
                            {details.album}
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    ) : (
                        <strong className="text-white">{details.album}</strong>
                    )}
                </span>
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

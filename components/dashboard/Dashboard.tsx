'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBoardRegistry } from '@/lib/hooks/useBoardRegistry';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Plus, Trash2, Layout } from 'lucide-react';

export function Dashboard() {
  const { boards, isLoading, createBoard, deleteBoard } = useBoardRegistry();
  const router = useRouter();

  const handleCreate = async () => {
    const id = await createBoard('Untitled Board');
    router.push(`/board/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
        await deleteBoard(id);
    }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">
            Loading registry...
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
                <BrandLogo colors={['#3b82f6']} variant="header" />
                <span className="text-2xl font-bold text-neutral-400 hidden sm:inline">/ Dashboard</span>
            </div>
            <button 
                onClick={handleCreate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
                <Plus size={18} />
                <span>New Board</span>
            </button>
        </div>

        {/* Board Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Create Card (Alternative) */}
            <button 
                onClick={handleCreate}
                className="flex flex-col items-center justify-center h-48 bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-neutral-900 transition-all group"
            >
                <div className="bg-neutral-800 p-3 rounded-full mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors text-neutral-400">
                    <Plus size={24} />
                </div>
                <span className="text-neutral-400 font-medium">Create New Board</span>
            </button>

            {/* Existing Boards */}
            {boards.map((board) => (
                <Link 
                    key={board.id} 
                    href={`/board/${board.id}`}
                    className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500/50 hover:shadow-lg hover:-translate-y-1 transition-all group relative"
                >
                    {/* Thumbnail / Icon Placeholder */}
                    <div className="h-28 bg-neutral-800 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-neutral-900/80" />
                        <Layout className="text-neutral-700 w-16 h-16" strokeWidth={1} />
                        
                        {/* Item Count Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-xs px-2 py-0.5 rounded-full text-neutral-400">
                            {board.itemCount} items
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-lg text-neutral-200 line-clamp-1 group-hover:text-blue-400 transition-colors">
                                {board.title}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1">
                                Modified {new Date(board.lastModified).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Delete Action (Hidden by default) */}
                    <button
                        onClick={(e) => handleDelete(e, board.id)}
                        className="absolute top-2 right-2 p-2 bg-neutral-950/80 hover:bg-red-900/80 text-neutral-400 hover:text-red-200 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Board"
                    >
                        <Trash2 size={16} />
                    </button>
                </Link>
            ))}
        </div>

        {boards.length === 0 && (
            <div className="text-center mt-12 text-neutral-600">
                <p>No boards found. Create one to get started!</p>
            </div>
        )}

      </div>
    </div>
  );
}

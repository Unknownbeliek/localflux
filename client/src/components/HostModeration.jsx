import React from 'react';

export default function HostModeration({ players, onMute, onUnmute, mutedSet }) {
  return (
    <div className="host-moderation">
      <p className="text-xs text-zinc-500 mb-2">Moderation</p>
      <div className="flex flex-col gap-2">
        {players.map(p => (
          <div key={p.id} className="flex items-center justify-between bg-zinc-900 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400">{p.name}</span>
            </div>
            <div className="flex gap-2">
              {mutedSet.has(p.id) ? (
                <button onClick={() => onUnmute(p.id)} className="bg-green-600 px-3 py-1 rounded-xl text-xs">UNMUTE</button>
              ) : (
                <button onClick={() => onMute(p.id)} className="bg-red-600 px-3 py-1 rounded-xl text-xs">MUTE</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

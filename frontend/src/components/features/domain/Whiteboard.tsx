import { useEffect, useState, useRef } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils, TLRecord, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useDebouncedCallback } from 'use-debounce';

interface WhiteboardProps {
    roomId: string;
    onEndConsultation?: (svgSnapshot: string) => void;
}

export function Whiteboard({ roomId, onEndConsultation }: WhiteboardProps) {
    const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
    const [editor, setEditor] = useState<Editor | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Track if we are currently handling remote changes to avoid echo
    const handlingRemoteRef = useRef(false);

    useEffect(() => {
        // Initialize WebSocket
        const wsUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsUrl}/api/v1/whiteboard/ws/${roomId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Connected to Whiteboard room: ${roomId}`);
        };

        ws.onmessage = (event) => {
            if (!store) return;
            try {
                const message = JSON.parse(event.data);
                
                // Set handlingRemote to true so our store.listen ignores these changes
                handlingRemoteRef.current = true;
                
                store.mergeRemoteChanges(() => {
                    if (message.type === 'init' || message.type === 'sync') {
                        // For full syncs
                        if (message.records) {
                           store.put(Object.values(message.records) as TLRecord[]);
                        }
                    } else if (message.type === 'delta') {
                        // Apply diffs
                        const { added, updated, removed } = message;
                        
                        if (added && added.length > 0) store.put(added);
                        if (updated && updated.length > 0) store.put(updated);
                        if (removed && removed.length > 0) store.remove(removed);
                    }
                });
                
                handlingRemoteRef.current = false;
            } catch (e) {
                console.error("Error parsing remote WB message", e);
                handlingRemoteRef.current = false;
            }
        };

        ws.onerror = (e) => {
            console.error("WebSocket error:", e);
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [roomId, store]);

    // Send delta diffs using debounced callback (max 60hz)
    const broadcastDelta = useDebouncedCallback((diff: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'delta',
                ...diff
            }));
        }
    }, 16, { maxWait: 16 });

    // Listen to local store changes and broadcast them
    useEffect(() => {
        if (!store) return;

        const cleanup = store.listen((entry) => {
            // Ignore if we are applying a remote change
            if (handlingRemoteRef.current) return;
            // Ignore if the change wasn't made by the user
            if (entry.source !== 'user') return;

            const added = Object.values(entry.changes.added);
            const updated = Object.values(entry.changes.updated).map(u => u[1]); // [0] is from, [1] is to
            const removed = Object.values(entry.changes.removed).map(r => r.id);

            if (added.length === 0 && updated.length === 0 && removed.length === 0) return;

            // Send out delta
            broadcastDelta({ added, updated, removed });
        }, { source: 'user', scope: 'document' });

        return cleanup;
    }, [store, broadcastDelta]);

    // Handle end of consultation snapshot
    useEffect(() => {
        if (editor && onEndConsultation) {
            (window as Window & { getWhiteboardSnapshot?: () => Promise<string | null> }).getWhiteboardSnapshot = async () => {
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                if (shapeIds.length === 0) return null;
                
                const svg = await editor.getSvgString(shapeIds);
                if (svg?.svg) {
                    onEndConsultation(svg.svg);
                    return svg.svg;
                }
                return null;
            };
        }
        
        return () => {
            delete (window as Window & { getWhiteboardSnapshot?: () => Promise<string | null> }).getWhiteboardSnapshot;
        };
    }, [editor, onEndConsultation]);

    return (
        <div className="w-full h-full relative" style={{ minHeight: '500px', backgroundColor: 'transparent' }}>
            <Tldraw 
                store={store} 
                onMount={setEditor} 
                inferDarkMode 
                className="z-0"
            />
        </div>
    );
}

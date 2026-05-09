import { useState } from 'react';
import { Power, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export function WakeUpButton() {
  const [status, setStatus] = useState<'idle' | 'waking' | 'ready'>('idle');
  const [message, setMessage] = useState('');
  
  const wakeUp = async () => {
    setStatus('waking');
    setMessage('Waking up server...');
    
    try {
      const startTime = Date.now();
      // Using the environment variable or the production URL
      const apiUrl = import.meta.env.VITE_API_URL || 'https://netra-ai-mcp.onrender.com';
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.ok) {
        setStatus('ready');
        setMessage(`Server ready in ${elapsed}s`);
        toast.success(`Server is online and responsive (${elapsed}s)`);
      } else {
        setStatus('idle');
        setMessage('Server not responding');
        toast.error('Server returned an error. Check logs.');
      }
    } catch (error) {
      setStatus('idle');
      setMessage('Failed to wake server');
      toast.error('Could not connect to server. It might be down.');
      console.error('Wake up failed:', error);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={wakeUp} 
        disabled={status === 'waking'}
        variant={status === 'ready' ? 'outline' : 'default'}
        className={`rounded-2xl px-6 h-11 shadow-lg font-bold flex items-center gap-2 transition-all duration-500 ${
          status === 'idle' ? 'bg-[#0D9488] hover:bg-[#0F766E] text-white' : 
          status === 'waking' ? 'bg-amber-500 text-white animate-pulse' : 
          'bg-white text-emerald-600 border-emerald-100'
        }`}
      >
        {status === 'idle' && <Power className="w-4 h-4" />}
        {status === 'waking' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'ready' && <CheckCircle2 className="w-4 h-4" />}
        
        {status === 'idle' && 'Wake Up Server'}
        {status === 'waking' && 'Waking Engine...'}
        {status === 'ready' && 'Engine Online'}
      </Button>
      {message && (
        <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          status === 'ready' ? 'text-emerald-500' : 'text-amber-500'
        }`}>
          {status === 'ready' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {message}
        </p>
      )}
    </div>
  );
}

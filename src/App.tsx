import { useEffect, useState } from 'react';

type Todo = { id: number; title: string; done: boolean; created_at: string };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  const refresh = async () => {
    const res = await fetch('/api/todos');
    const data = await res.json();
    setTodos(data.todos);
  };

  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!title.trim()) return;
    await fetch('/api/todos', { method: 'POST', body: JSON.stringify({ title }) });
    setTitle('');
    await refresh();
  };

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Fullstack Starter</h1>
        <p className="text-sm text-gray-400">Vite + React 19 + Tailwind v4 + Cloud Run API + Drizzle (PostgreSQL)</p>
      </header>

      <section className="rounded-2xl border border-gray-800 p-4">
        <div className="flex gap-2">
          <input className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2"
                 placeholder="add todo..." value={title} onChange={e => setTitle(e.target.value)} />
          <button className="rounded-xl bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 active:translate-y-px"
                  onClick={add}>Add</button>
        </div>
      </section>

      <ul className="space-y-2">
        {todos.map(t => (
          <li key={t.id} className="rounded-xl border border-gray-800 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</div>
            </div>
            <span className="text-sm text-gray-400">{t.done ? '✅' : '⬜️'}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

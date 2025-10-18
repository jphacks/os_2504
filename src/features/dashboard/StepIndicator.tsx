import type { StepId } from '../../lib/types';

const steps: Array<{ id: StepId; title: string; caption: string; description: string }> = [
  { id: 'create', title: 'Step 1', caption: 'ルーム作成', description: '検索条件と名称を決めて準備を開始します。' },
  { id: 'members', title: 'Step 2', caption: 'メンバー招待', description: '参加者を追加し、投票用トークンを発行します。' },
  { id: 'voting', title: 'Step 3', caption: '投票＆結果確認', description: 'カードを評価し、ランキングを確認します。' },
];

export function StepIndicator({ active }: { active: StepId }) {
  return (
    <ol className="step-indicator">
      {steps.map((step, index) => {
        const isActive = step.id === active;
        const isCompleted = steps.findIndex((s) => s.id === active) > index;
        return (
          <li
            key={step.id}
            className={`step-card ${isCompleted ? 'step-card--done' : isActive ? 'step-card--active' : ''}`}
          >
            <div className="step-card__header">
              <span className={`step-card__badge ${isCompleted ? 'is-done' : isActive ? 'is-active' : ''}`}>{index + 1}</span>
              <div>
                <p className="step-card__title">{step.title}</p>
                <p className="step-card__caption">{step.caption}</p>
              </div>
            </div>
            <p className="step-card__description">{step.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

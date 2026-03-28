import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { GripVertical, Star, StarOff, X } from 'lucide-react';
import './CorkboardRoadmap.css';

interface CustomNodeData {
  label: string;
  difficulty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REVISION_REQUIRED' | 'LOCKED' | 'ACTIVE';
  isEditMode?: boolean;
  category?: string;
  targetUserState?: string;
  onDeleteNode?: (nodeId: string) => void;
}

const CustomNode: React.FC<NodeProps> = ({ id, data }) => {
  const d = data as unknown as CustomNodeData;
  const isCompleted = d.status === 'COMPLETED';
  const isActive = d.status === 'IN_PROGRESS' || d.status === 'ACTIVE';
  const isFailed = d.status === 'FAILED';
  const isRevision = d.status === 'REVISION_REQUIRED';

  const category = d.category || (
    isCompleted ? 'Done' :
    isFailed ? 'Retry' :
    isRevision ? 'Revision' :
    isActive ? 'In Progress' : 'Pending'
  );

  const wrapperClass = [
    'paper-node-wrapper',
    isActive ? 'paper-node-active-wrapper' : '',
    isCompleted ? 'paper-node-completed-wrapper' : '',
    (isFailed || isRevision) ? 'paper-node-failed-wrapper' : '',
  ].filter(Boolean).join(' ');

  const editClass = d.isEditMode ? 'paper-node-editing' : '';

  return (
    <div className={wrapperClass}>
      {/* Delete button — only in edit mode, appears on hover */}
      {d.isEditMode && d.onDeleteNode && (
        <button
          className="paper-node-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            d.onDeleteNode!(id);
          }}
          title="Delete node"
        >
          <X size={10} />
        </button>
      )}

      <div className={`paper-node ${editClass}`}>
        {isCompleted && <span className="paper-node-checkmark">✓</span>}
        {(isFailed || isRevision) && (
          <span className="paper-node-revision-mark">{isFailed ? '✗' : '↻'}</span>
        )}

        {d.isEditMode && (
          <div className="paper-node-drag-handle"><GripVertical size={12} /></div>
        )}

        <div style={{ paddingLeft: d.isEditMode ? 14 : 0 }}>
          <div className="paper-node-category">{category}</div>
          <h3 className="paper-node-title">{d.label}</h3>
          {d.targetUserState && <p className="paper-node-detail">{d.targetUserState}</p>}
          <div className="paper-node-stars">
            {[1, 2, 3, 4, 5].map((s) =>
              s <= (d.difficulty || 0) ? (
                <Star key={s} className="paper-node-star-filled" fill="currentColor" />
              ) : (
                <StarOff key={s} className="paper-node-star-empty" />
              )
            )}
          </div>
        </div>

        <div className="paper-node-fold" />

        <Handle type="target" position={Position.Top} style={{ visibility: d.isEditMode ? 'visible' : 'hidden' }} />
        <Handle type="source" position={Position.Bottom} style={{ visibility: d.isEditMode ? 'visible' : 'hidden' }} />
      </div>
    </div>
  );
};

export default React.memo(CustomNode);

import React, { useState } from 'react';
import { IBatchTreeNode } from '@hs/shared';
import { ChevronRight, ChevronDown, Layers, Plus, Edit2, Trash2 } from 'lucide-react';

interface BatchTreeProps {
  nodes: IBatchTreeNode[];
  onAddSubBatch: (parent: IBatchTreeNode) => void;
  onEditBatch: (node: IBatchTreeNode) => void;
  onDeleteBatch: (node: IBatchTreeNode) => void;
}

const TreeNode: React.FC<{
  node: IBatchTreeNode;
  onAddSubBatch: (parent: IBatchTreeNode) => void;
  onEditBatch: (node: IBatchTreeNode) => void;
  onDeleteBatch: (node: IBatchTreeNode) => void;
}> = ({ node, onAddSubBatch, onEditBatch, onDeleteBatch }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-lg group transition-colors border border-transparent hover:border-slate-200">
        <div className="flex items-center space-x-2">
          {hasChildren ? (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded focus:outline-none"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <Layers className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-800 text-sm">{node.code}</span>
          <span className="text-slate-500 text-sm">— {node.name}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono">
            depth {node.depth}
          </span>
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-opacity">
          <button
            onClick={() => onAddSubBatch(node)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center space-x-1"
            title="Add Sub-batch"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sub-batch</span>
          </button>
          <button
            onClick={() => onEditBatch(node)}
            className="p-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
            title="Edit Batch"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteBatch(node)}
            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs"
            title="Delete Batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="ml-6 pl-2 border-l-2 border-slate-200 mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onAddSubBatch={onAddSubBatch}
              onEditBatch={onEditBatch}
              onDeleteBatch={onDeleteBatch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const BatchTree: React.FC<BatchTreeProps> = ({ nodes, onAddSubBatch, onEditBatch, onDeleteBatch }) => {
  if (nodes.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        No batches created yet. Click "Add Root Batch" above to start building the rotation hierarchy.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 divide-y divide-slate-100 shadow-sm">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          onAddSubBatch={onAddSubBatch}
          onEditBatch={onEditBatch}
          onDeleteBatch={onDeleteBatch}
        />
      ))}
    </div>
  );
};

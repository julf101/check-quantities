import React from 'react';
import ProductImage from './ProductImage.jsx';
import { formatSize } from '../utils.js';

export default function ProductCard({ item, onOpen }) {
  const first = item.colors[0];
  return (
    <button
      onClick={() => onOpen(item.code, { colorCode: first?.code, materialNumberId: item.matchedSizes[0]?.materialNumberId })}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition text-left overflow-hidden"
    >
      <ProductImage code={first?.imageCode} width={300} alt={item.name} className="w-full aspect-[4/5]" />
      <div className="p-3">
        <div className="font-semibold text-sm leading-tight">{item.name}</div>
        <div className="text-xs text-gray-500 mt-1">
          {item.gender} · {item.category} · {item.season}
        </div>
        {item.matchedSizes.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-xs">
            {item.matchedSizes.slice(0, 4).map((sz) => (
              <li key={sz.materialNumberId} className="flex justify-between">
                <span>
                  {item.colors.find((c) => c.code === sz.colorCode)?.label} · {formatSize(sz.size)}
                </span>
                <span className="font-medium text-green-700">{sz.quantity} en stock</span>
              </li>
            ))}
            {item.matchedSizes.length > 4 && <li className="text-gray-400">+ {item.matchedSizes.length - 4} autres tailles</li>}
          </ul>
        ) : (
          <div className="mt-2 text-xs">
            <ul className="space-y-0.5">
              {item.colors.slice(0, 3).map((c) => (
                <li key={c.code} className="flex justify-between text-gray-600">
                  <span className="truncate pr-2">{c.label}</span>
                  <span>{c.total}</span>
                </li>
              ))}
              {item.colors.length > 3 && <li className="text-gray-400">+ {item.colors.length - 3} autres coloris</li>}
            </ul>
            <div className="flex justify-between font-medium text-green-700 border-t mt-1 pt-1">
              <span>{item.narrowed || item.colors.length === 1 ? 'En stock' : `Total (${item.colors.length} coloris)`}</span>
              <span>{item.total}</span>
            </div>
          </div>
        )}
        <div className="text-[10px] text-gray-400 mt-1">{item.code}</div>
      </div>
    </button>
  );
}

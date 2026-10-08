import React from 'react';
import { BookOpen, Clock, CheckCircle2, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';
import { Course, Purchase } from '../types/index.js';

interface KPICardsProps {
  courses: Course[];
  purchases: Purchase[];
  currency: string;
  onFilterPending?: () => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  courses,
  purchases,
  currency,
  onFilterPending
}) => {
  const activeCourses = courses.filter(c => c.status.toLowerCase() === 'active').length;
  const inactiveCourses = courses.filter(c => c.status.toLowerCase() === 'inactive').length;

  const pendingPurchases = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED');
  const paidPurchases = purchases.filter(p => p.status === 'PAID');
  const totalRevenue = paidPurchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const cards = [
    {
      title: 'Total Courses',
      value: courses.length,
      subtitle: `${activeCourses} Active • ${inactiveCourses} Inactive`,
      icon: BookOpen,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      badge: `${activeCourses} Live`,
      badgeColor: 'bg-blue-50 text-blue-700'
    },
    {
      title: 'Pending Approvals',
      value: pendingPurchases.length,
      subtitle: 'Awaiting Bank/UPI check',
      icon: Clock,
      iconBg: pendingPurchases.length > 0
        ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
        : 'bg-slate-50 text-slate-500 border-slate-200',
      badge: pendingPurchases.length > 0 ? 'Requires Action' : 'All Clear',
      badgeColor: pendingPurchases.length > 0
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-600',
      onClick: onFilterPending
    },
    {
      title: 'Verified Deliveries',
      value: paidPurchases.length,
      subtitle: 'Drive link & ZIP released',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      badge: '100% Manual Proof',
      badgeColor: 'bg-emerald-50 text-emerald-700'
    },
    {
      title: 'Total Revenue',
      value: `${currency}${totalRevenue.toLocaleString()}`,
      subtitle: 'From approved orders only',
      icon: IndianRupee,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      badge: 'No Gateway Fees',
      badgeColor: 'bg-indigo-50 text-indigo-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={card.onClick}
            className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-sm ${
              card.onClick ? 'cursor-pointer hover:border-amber-300' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {card.value}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-400 font-medium">
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
};

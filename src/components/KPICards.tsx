import React from 'react';
import { BookOpen, Clock, CheckCircle2, IndianRupee, TrendingUp } from 'lucide-react';
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
      subtitle: `${activeCourses} Active · ${inactiveCourses} Inactive`,
      icon: BookOpen,
      iconGradient: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
      badge: `${activeCourses} Live`,
      badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      title: 'Pending Approvals',
      value: pendingPurchases.length,
      subtitle: 'Awaiting Bank/UPI check',
      icon: Clock,
      iconGradient: pendingPurchases.length > 0
        ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)'
        : 'linear-gradient(180deg, #94A3B8 0%, #64748B 100%)',
      badge: pendingPurchases.length > 0 ? 'Requires Action' : 'All Clear',
      badgeStyle: pendingPurchases.length > 0
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-600 border-slate-200',
      onClick: onFilterPending,
      isPendingAlert: pendingPurchases.length > 0
    },
    {
      title: 'Verified Deliveries',
      value: paidPurchases.length,
      subtitle: 'Drive link & ZIP released',
      icon: CheckCircle2,
      iconGradient: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
      badge: '100% Verified',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      title: 'Total Revenue',
      value: `${currency}${totalRevenue.toLocaleString()}`,
      subtitle: 'From approved orders only',
      icon: IndianRupee,
      iconGradient: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
      badge: '0% Gateway Cut',
      badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={card.onClick}
            className={`clay-card p-5 sm:p-6 transition-all duration-200 ${
              card.onClick ? 'clay-card-interactive' : ''
            } ${
              card.isPendingAlert ? 'ring-2 ring-amber-400/40 bg-gradient-to-b from-amber-50/20 to-white' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{
                  background: card.iconGradient,
                  boxShadow: '0 6px 14px -2px rgba(35, 45, 65, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                {card.value}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${card.badgeStyle}`}>
                {card.badge}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-400 font-medium">
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
};


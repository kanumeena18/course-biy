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
      subtitle: `${activeCourses} Active · ${inactiveCourses} Inactive`,
      icon: BookOpen,
      iconBg: 'bg-[#1A1D32] text-[#875CE9] border-[#30354D]',
      badge: `${activeCourses} Live`,
      badgeColor: 'bg-[#6366F1]/15 text-[#875CE9] border border-[#6366F1]/30'
    },
    {
      title: 'Pending Approvals',
      value: pendingPurchases.length,
      subtitle: 'Awaiting Bank/UPI check',
      icon: Clock,
      iconBg: pendingPurchases.length > 0
        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 animate-pulse'
        : 'bg-[#1A1D32] text-[#9CA3AF] border-[#30354D]',
      badge: pendingPurchases.length > 0 ? 'Requires Action' : 'All Clear',
      badgeColor: pendingPurchases.length > 0
        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
        : 'bg-[#1A1D32] text-[#9CA3AF] border border-[#30354D]',
      onClick: onFilterPending
    },
    {
      title: 'Verified Deliveries',
      value: paidPurchases.length,
      subtitle: 'Drive link & ZIP released',
      icon: CheckCircle2,
      iconBg: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
      badge: '100% Manual Proof',
      badgeColor: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
    },
    {
      title: 'Total Revenue',
      value: `${currency}${totalRevenue.toLocaleString()}`,
      subtitle: 'From approved orders only',
      icon: IndianRupee,
      iconBg: 'bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30',
      badge: 'No Gateway Fees',
      badgeColor: 'bg-[#875CE9]/15 text-[#875CE9] border border-[#875CE9]/30'
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
            className={`bg-[#111426] border border-[#252A3D] rounded-2xl p-4 sm:p-5 transition-all hover:border-[#30354D] ${
              card.onClick ? 'cursor-pointer hover:border-[#F59E0B]/50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl border ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
                {card.value}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <div className="mt-1 text-xs text-[#6B7280] font-medium">
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
};


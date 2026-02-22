"use client";

import {
  AlertTriangle,
  Archive,
  LayoutDashboard,
  Tag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import CardExpenseSummary from "./CardExpenseSummary";
import CardPopularProducts from "./CardPopularProducts";
import StatCard from "./StatCard";
import Header from "@/app/(components)/Header";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <Header 
        name={t("sidebar.dashboard")} 
        subtitle={t("pages.dashboardSubtitle")}
        icon={LayoutDashboard}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:overflow-auto gap-10 pb-4 custom-grid-rows mt-4">
        <CardPopularProducts />
        <CardExpenseSummary />
        
        <StatCard
          title={t("dashboard.assetAndInventoryValue")}
          primaryIcon={<Archive className="text-blue-600 w-6 h-6" />}
          dateRange={t("dashboard.updatedToday")}
          details={[
            {
              title: t("dashboard.totalInventoryValue"),
              amount: "$25,430.00",
              changePercentage: 15,
              IconComponent: TrendingUp,
            },
            {
              title: t("dashboard.assetDepreciation"),
              amount: "$1,200.00",
              changePercentage: -5,
              IconComponent: TrendingDown,
            },
          ]}
        />
        
        <StatCard
          title={t("dashboard.inventoryAlerts")}
          primaryIcon={<AlertTriangle className="text-orange-500 w-6 h-6" />}
          dateRange={t("dashboard.last7Days")}
          details={[
            {
              title: t("dashboard.lowStock"),
              amount: "12",
              changePercentage: 20,
              IconComponent: TrendingUp,
            },
            {
              title: t("dashboard.damagedGoods"),
              amount: "3",
              changePercentage: -50,
              IconComponent: TrendingDown,
            },
          ]}
        />
        
        <StatCard
          title={t("dashboard.expenseFluctuations")}
          primaryIcon={<Tag className="text-green-600 w-6 h-6" />}
          dateRange={t("dashboard.currentMonth")}
          details={[
            {
              title: t("dashboard.operatingExpenses"),
              amount: "$5,100.00",
              changePercentage: 10,
              IconComponent: TrendingUp,
            },
            {
              title: t("dashboard.savedBudget"),
              amount: "$850.00",
              changePercentage: -15,
              IconComponent: TrendingDown,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Dashboard;
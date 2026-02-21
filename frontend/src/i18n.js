import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Sidebar & Navigation
      "core_operations": "Core Operations",
      "resources": "Resources",
      "administration": "Administration",
      "support": "Support",
      "system_root": "System Root",
      "dashboard": "Dashboard",
      "projects": "Projects",
      "tasks": "Tasks",
      "calendar": "Calendar",
      "timeline": "Timeline",
      "inventory": "Inventory",
      "tools": "Tools",
      "cars": "Cars",
      "vendors": "Vendors",
      "time_tracking": "Time Tracking",
      "hr_payroll": "HR & Payroll",
      "customers": "Customers",
      "service_rates": "Service Rates",
      "analytics": "Analytics",
      "personnel": "Personnel",
      "laws_standards": "Laws and Standards",
      "tutorials": "Tutorials",
      "tenant_registry": "Tenant Registry",
      "admin_tools": "Admin Tools",
      "account_settings": "Account Settings",
      "secure_logout": "Secure Logout",
      "logged_in_as": "Logged in as",

      // Common Actions & UI
      "save_changes": "Save Changes",
      "cancel": "Cancel",
      "edit": "Edit",
      "delete": "Delete",
      "create_new": "Create New",
      "loading": "Synchronizing Registry...",
      "syncing": "Synchronizing...",
      "status": "Status",
      "actions": "Actions",
      "search": "Search registry...",
      "search_placeholder": "Search by identifier...",
      "no_data": "No records found in this sector.",
      "abort": "Abort Protocol",
      "refresh": "Refresh Registry",

      // Home Page & Clock-In
      "good_morning": "Good Morning",
      "good_afternoon": "Good Day",
      "good_evening": "Good Evening",
      "user": "User",
      "system_status": "System Status",
      "online": "Online",
      "select_project": "Select Project",
      "clock_in": "Start Work Session",
      "clock_out": "Terminate Session",
      "active_session": "Active Session",
      "managed_projects": "Managed Infrastructure",
      "view_all": "View All",

      // Project & Task Registry
      "project_name": "Project Name",
      "client": "Client",
      "due_date": "Due Date",
      "start_date": "Start Date",
      "priority": "Priority",
      "description": "Description",
      "budget": "Budget",
      "location": "Location",
      "manager": "Site Manager",
      "commission_task": "Commission & Archive",
      "archive": "Archive",
      "infrastructure_registry": "Infrastructure Registry",
      "all_statuses": "All Statuses",
      "planning": "Planning",
      "active": "Active",
      "completed": "Completed",
      "on_hold": "On Hold",

      // Inventory & Logistics
      "global_inventory": "Global Material Registry",
      "stock_level": "Stock Level",
      "unit": "Unit",
      "warehouse": "Warehouse",
      "low_stock": "Low Stock Alert",
      "item_name": "Item Name",
      "category": "Category",
      "sku": "SKU / ID",

      // Accounting & HR
      "payslips": "Payslips",
      "leave_requests": "Leave Requests",
      "netto": "Net Total",
      "approve": "Authorize",
      "reject": "Decline",
      "pending_approvals": "Pending Approvals",
      "sick_day": "Sick Leave"
    }
  },
  is: {
    translation: {
      // Sidebar & Navigation
      "core_operations": "Kjarnastarfsemi",
      "resources": "Auðlindir",
      "administration": "Stjórnsýsla",
      "support": "Stuðningur",
      "system_root": "Kerfisstjórnun",
      "dashboard": "Stjórnborð",
      "projects": "Verkefni",
      "tasks": "Verk",
      "calendar": "Dagatal",
      "timeline": "Tímalína",
      "inventory": "Lager",
      "tools": "Verkfæri",
      "cars": "Bílafloti",
      "vendors": "Birgjar",
      "time_tracking": "Tímaskráning",
      "hr_payroll": "Laun & HR",
      "customers": "Viðskiptavinir",
      "service_rates": "Taxtaskrá",
      "analytics": "Greiningar",
      "personnel": "Starfsfólk",
      "laws_standards": "Lög og staðlar",
      "tutorials": "Leiðbeiningar",
      "tenant_registry": "Leigjendaskrá",
      "admin_tools": "Kerfisverkfæri",
      "account_settings": "Stillingar",
      "secure_logout": "Örugg útskráning",
      "logged_in_as": "Skráður inn sem",

      // Common Actions & UI
      "save_changes": "Vista breytingar",
      "cancel": "Hætta við",
      "edit": "Breyta",
      "delete": "Eyða",
      "create_new": "Nýskrá",
      "loading": "Samstilli gagnagrunn...",
      "syncing": "Samstilli...",
      "status": "Staða",
      "actions": "Aðgerðir",
      "search": "Leita í skrá...",
      "search_placeholder": "Leita...",
      "no_data": "Engar færslur fundust.",
      "abort": "Hætta við",
      "refresh": "Uppfæra skrá",

      // Home Page & Clock-In
      "good_morning": "Góðan daginn",
      "good_afternoon": "Góðan daginn",
      "good_evening": "Gott kvöld",
      "user": "Notandi",
      "system_status": "Staða kerfis",
      "online": "Tengt",
      "select_project": "Veldu verkefni",
      "clock_in": "Stimpla inn",
      "clock_out": "Stimpla út",
      "active_session": "Í vinnu",
      "managed_projects": "Mín verkefni",
      "view_all": "Sjá allt",

      // Project & Task Registry
      "project_name": "Heiti verkefnis",
      "client": "Viðskiptavinur",
      "due_date": "Skiladagur",
      "start_date": "Upphafsdagur",
      "priority": "Forgangur",
      "description": "Lýsing",
      "budget": "Fjárhagsáætlun",
      "location": "Staðsetning",
      "manager": "Verkefnastjóri",
      "commission_task": "Úttekt verks",
      "archive": "Safn",
      "infrastructure_registry": "Verkefnaskrá",
      "all_statuses": "Allar stöður",
      "planning": "Í undirbúningi",
      "active": "Í vinnslu",
      "completed": "Lokið",
      "on_hold": "Í bið",

      // Inventory & Logistics
      "global_inventory": "Efnisskrá",
      "stock_level": "Lagerstaða",
      "unit": "Eining",
      "warehouse": "Vöruhús",
      "low_stock": "Lág lagerstaða",
      "item_name": "Heiti vöru",
      "category": "Flokkur",
      "sku": "Vörunúmer",

      // Accounting & HR
      "payslips": "Launaseðlar",
      "leave_requests": "Leyfisbeiðnir",
      "netto": "Útborgað",
      "approve": "Samþykkja",
      "reject": "Hafna",
      "pending_approvals": "Bíður samþykkis",
      "sick_day": "Veikindi"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
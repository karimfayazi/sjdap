# Global UI Styling Refactor Summary

## Overview
This refactor standardizes filter sections and table layouts across the entire application to match the design from `/dashboard/rops/report`.

## New Shared Components Created

### 1. Style Constants (`src/lib/ui/reportStyles.ts`)
- Centralized style constants extracted from the reference page
- Includes: filterBar, filterLabel, filterControl, tableCard, table, tableHeaderCell, tableCell, pagination styles

### 2. FilterBar Component (`src/components/common/FilterBar.tsx`)
- Standard filter container with consistent styling
- Supports 4 or 5 column layouts
- Props: `children`, `columns` (4|5), `withSpacing` (boolean)

### 3. FilterField Component (`src/components/common/FilterField.tsx`)
- Standard wrapper for label + control
- Ensures consistent label styling
- Props: `label`, `children`, `className` (optional)

### 4. DataCardTable Component (`src/components/common/DataCardTable.tsx`)
- Standard table container/card wrapper
- Matches reference page table styling
- Props: `children`, `className` (optional)

### 5. FilterControl Utilities (`src/components/common/FilterControl.tsx`)
- Standard input/select components with consistent styling
- Exports: `FilterInput`, `FilterSelect`, `filterControlClassName`

## Pages Updated

### ✅ Completed
1. **`src/app/dashboard/baseline-qol/page.tsx`**
   - Updated filter section to use FilterBar and FilterField
   - Updated table to use DataCardTable and reportStyles
   - Updated pagination to use reportStyles

2. **`src/app/dashboard/family-status/page.tsx`**
   - Updated filter section to use FilterBar and FilterField
   - Updated table to use DataCardTable and reportStyles
   - Updated pagination to use reportStyles

## Pattern for Updating Remaining Pages

### For Filter Sections:
```tsx
// Before:
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
      <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#0b4d2b] focus:border-transparent" />
    </div>
  </div>
</div>

// After:
import FilterBar from "@/components/common/FilterBar";
import FilterField from "@/components/common/FilterField";
import { reportStyles } from "@/lib/ui/reportStyles";

<FilterBar columns={4}>
  <FilterField label="Label">
    <input className={reportStyles.filterControl} />
  </FilterField>
</FilterBar>
```

### For Tables:
```tsx
// Before:
<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Header</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

// After:
import DataCardTable from "@/components/common/DataCardTable";
import { reportStyles } from "@/lib/ui/reportStyles";

<DataCardTable>
  <table className={reportStyles.table}>
    <thead className={reportStyles.tableHeader}>
      <tr>
        <th className={reportStyles.tableHeaderCell}>Header</th>
      </tr>
    </thead>
    <tbody className={reportStyles.tableBody}>
      <tr className={reportStyles.tableRow}>
        <td className={reportStyles.tableCell}>Data</td>
      </tr>
    </tbody>
  </table>
</DataCardTable>
```

### For Pagination:
```tsx
// Before:
<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
  <div className="text-sm text-gray-700">...</div>
  <button className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">...</button>
</div>

// After:
import { reportStyles } from "@/lib/ui/reportStyles";

<div className={reportStyles.paginationContainer}>
  <div className={reportStyles.paginationText}>...</div>
  <button className={reportStyles.paginationButton}>...</button>
</div>
```

## Remaining Pages to Update

Pages that likely need updates (based on codebase search):
- `src/app/dashboard/swb-families/page.tsx`
- `src/app/dashboard/others/rop-update/page.tsx`
- `src/app/dashboard/approval-section/rop-approval/page.tsx`
- `src/app/dashboard/approval-section/intervention-approval/page.tsx`
- `src/app/dashboard/approval-section/bank-account-approval/page.tsx`
- `src/app/dashboard/approval-section/baseline-approval/page.tsx`
- `src/app/dashboard/last-night-updates/page.tsx`
- `src/app/dashboard/edo/dashboard/page.tsx`
- `src/app/dashboard/reports/page.tsx`
- And others with filter/table sections

## Important Notes

1. **DO NOT change:**
   - Headings/titles
   - Column names
   - Label text
   - Data values
   - Business logic
   - API calls
   - Filtering logic

2. **ONLY change:**
   - Container className values
   - Input/select className values
   - Table wrapper className values
   - Replace manual styling with shared components/styles

3. **Verification:**
   - All headings remain unchanged
   - All data rendering remains unchanged
   - TypeScript compiles without errors
   - Visual appearance matches reference page

## Next Steps

1. Update remaining pages following the patterns above
2. Test each page to ensure functionality is preserved
3. Verify visual consistency with reference page
4. Run TypeScript compiler to check for errors

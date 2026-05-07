// Responsive Container Utilities

export const containerClasses = {
  // Page containers
  page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  narrow: 'max-w-4xl mx-auto px-4 sm:px-6',
  wide: 'max-w-full px-4 sm:px-6 lg:px-8',
  
  // Card/Panel
  card: 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6',
  
  // Grid layouts
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6',
  grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6',
  
  // Stat cards
  statGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
  
  // Form layouts
  formGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  formSingle: 'space-y-4',
  
  // Button groups
  btnGroup: 'flex flex-col sm:flex-row gap-2 sm:gap-3',
  btnGroupRight: 'flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end',
};

export const textClasses = {
  // Headings
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
  h3: 'text-lg sm:text-xl font-semibold',
  
  // Body
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
  
  // Truncate
  truncate: 'truncate',
  clamp2: 'line-clamp-2',
  clamp3: 'line-clamp-3',
};

export const spacingClasses = {
  section: 'py-6 sm:py-8 lg:py-12',
  sectionSm: 'py-4 sm:py-6',
  gap: 'gap-4 sm:gap-6',
  gapSm: 'gap-2 sm:gap-3',
};

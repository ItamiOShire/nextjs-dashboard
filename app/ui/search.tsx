'use client';

import {useDebouncedCallback} from 'use-debounce';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Search({ placeholder }: { placeholder: string }) {

  const searchParams = useSearchParams();
  const router = useRouter();
  const path = usePathname();

  function handleSearch(term: string) {

    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(1)); // Reset to page 1 on new search

    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    router.replace(`${path}?${params.toString()}`);
    // This will update the URL without reloading the page
    // and will trigger a re-render of the component with the new search term.
  }

  const handleSearchDebounced = useDebouncedCallback((term) => {
    console.log("Searching... " + term);

    handleSearch(term);
  }, 300 ); // Adjust the debounce delay as needed (300ms in this case)

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        onChange={(e) => handleSearchDebounced(e.target.value)}
        defaultValue={searchParams.get('query')?.toString()}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionsTable } from '../transactions-table'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    },
    status: 'authenticated',
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

// Create a mock transaction
const mockTransaction = {
  id: 'test-id-1',
  accountId: 'test-account-1',
  description: 'Test Transaction',
  amount: 50.00,
  date: '2025-10-13',
  type: 'EXPENSE' as const,
  account: { id: 'test-account-1', name: 'Test Account' },
  category: { id: 'test-category-1', name: 'Test Category' },
  merchant: { id: 'test-merchant-1', name: 'Test Merchant' },
}

describe('TransactionsTable', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    })

    // Reset fetch mock
    vi.mocked(fetch).mockReset()

    // Mock successful transactions fetch
    vi.mocked(fetch).mockImplementation((url) => {
      if (url.toString().includes('/api/transactions')) {
        const page = new URL(url.toString()).searchParams.get('page') || '1'
        const search = new URL(url.toString()).searchParams.get('search') || ''
        const sortBy = new URL(url.toString()).searchParams.get('sortBy') || 'date'

        // For filtering test, only return results when search matches
        let transactions = [mockTransaction]
        if (search && !mockTransaction.description.toLowerCase().includes(search.toLowerCase())) {
          transactions = []
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: transactions,
            total: transactions.length,
            page: parseInt(page),
            pageSize: 25,
            totalPages: Math.ceil(transactions.length / 25)
          }),
        } as Response)
      }
      if (url.toString().includes('/api/accounts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [{ id: 'test-account-1', name: 'Test Account', type: 'CHECKING' }] }),
        } as Response)
      }
      if (url.toString().includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: [{ id: 'test-category-1', name: 'Test Category' }] }),
        } as Response)
      }
      if (url.toString().includes('/api/merchants')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ merchants: [{ id: 'test-merchant-1', name: 'Test Merchant' }] }),
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )
  })

  it('displays transactions data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // First we might see a loading state
    expect(await screen.findByRole('table')).toBeInTheDocument()

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Check that transaction details are displayed
    expect(screen.getByText('Test Account')).toBeInTheDocument()
    expect(screen.getByText('Test Category')).toBeInTheDocument()
    expect(screen.getByText('Test Merchant')).toBeInTheDocument()
    expect(screen.getByText('-$50.00')).toBeInTheDocument()
  })

  it('handles pagination correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Try to go to next page
    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)

    // Verify the fetch call was made with the correct page parameter
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.anything()
    )
  })

  it('handles sorting', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Click on Amount header to sort
    const amountHeader = screen.getByRole('button', { name: 'Amount' })
    fireEvent.click(amountHeader)

    // Verify the fetch call was made with the correct sort parameters
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=amount'),
      expect.anything()
    )
  })

  it('handles filtering', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Find and use the search input
    const searchInput = screen.getByPlaceholderText('Search descriptions...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    // Verify the fetch call was made with the search parameter
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.anything()
      )
    })
  })

  it('handles edit button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button', { name: 'Edit' })
    fireEvent.click(editButtons[0])

    // Check if edit dialog appears
    await waitFor(() => {
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    })
  })

  it('handles delete button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionsTable />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    })

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[0])

    // Check if delete confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete Transaction')).toBeInTheDocument()
    })
  })
})
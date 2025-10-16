import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransactionFormDialog } from '../transaction-form-dialog'
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

// Create mock data
const mockAccounts = [
  { id: 'test-account-1', name: 'Test Account', type: 'CHECKING' },
  { id: 'test-account-2', name: 'Test Credit Card', type: 'CREDIT' }
]

const mockCategories = [
  { id: 'test-category-1', name: 'Test Category', type: 'EXPENSE' },
  { id: 'test-category-2', name: 'Test Income', type: 'INCOME' }
]

const mockMerchants = [
  { id: 'test-merchant-1', name: 'Test Merchant' },
  { id: 'test-merchant-2', name: 'Another Merchant' }
]

const mockTransaction = {
  id: 'test-id-1',
  accountId: mockAccounts[0].id,
  description: 'Test Transaction',
  amount: 50.00,
  date: '2025-10-13',
  type: 'EXPENSE' as const,
  categoryId: mockCategories[0].id,
  merchantId: mockMerchants[0].id,
  userId: 'test-user-id',
  createdAt: '2025-10-13T00:00:00.000Z',
  updatedAt: '2025-10-13T00:00:00.000Z'
}

describe('TransactionFormDialog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url)
      
      // Mock GET responses
      if (url.pathname.includes('/api/accounts')) {
        return new Response(JSON.stringify(mockAccounts))
      }
      if (url.pathname.includes('/api/categories')) {
        return new Response(JSON.stringify(mockCategories))
      }
      if (url.pathname.includes('/api/merchants')) {
        return new Response(JSON.stringify(mockMerchants))
      }
      
      // Mock POST /api/transactions
      if (url.pathname.includes('/api/transactions') && url.toString().includes('method=POST')) {
        const body = JSON.parse(await (input as Request).text())
        return new Response(JSON.stringify({ ...mockTransaction, ...body, id: 'new-id' }), { status: 201 })
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    })

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        }
      },
    })

    // Reset mocks
    vi.resetAllMocks()
    
    // Mock fetch responses
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      
      if (url.includes('/api/accounts')) {
        return new Response(JSON.stringify({ accounts: mockAccounts }))
      }
      
      if (url.includes('/api/categories')) {
        return new Response(JSON.stringify({ categories: mockCategories }))
      }
      
      if (url.includes('/api/merchants')) {
        return new Response(JSON.stringify({ merchants: mockMerchants }))
      }
      
      if (url.includes('/api/transactions')) {
        if (url.includes('test-id-1')) {
          return new Response(JSON.stringify({ transaction: mockTransaction }))
        }
        return new Response(JSON.stringify({ transactions: [mockTransaction] }))
      }
      
      return new Response(null, { status: 404 })
    })
  })

  it('renders empty form correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Add New Transaction')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
  })

  it('renders edit form with transaction data', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={mockTransaction}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Test Transaction')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-10-13')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument()
    })

    // Try to submit empty form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Check for validation messages
    await waitFor(() => {
      // Wait for validation messages to appear
      const errorMessages = screen.getAllByTestId('form-error')
      const messages = errorMessages.map(msg => msg.textContent)
      expect(messages).toContain('Description is required')
      expect(messages).toContain('Account is required')
    })
  })

  it('handles successful form submission', async () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={onClose}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Wait for form to be ready and data to load
    await waitFor(() => {
      expect(screen.getByLabelText('Account')).toBeInTheDocument()
    })

    // Fill out form
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New Transaction' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.00' },
    })
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-10-13' },
    })
    fireEvent.change(screen.getByLabelText('Account'), {
      target: { value: mockAccounts[0].id },
    })

    // Submit form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Verify form submission and dialog close
    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls
      // Find the POST call to /api/transactions
      const transactionCall = calls.find(
        call => call[0].toString().includes('/api/transactions') && 
               call[1]?.method === 'POST'
      )
      expect(transactionCall).toBeTruthy()
      expect(transactionCall![0]).toContain('/api/transactions')
      expect(transactionCall![1]).toMatchObject({
        method: 'POST',
        body: expect.any(String),
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles form submission errors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={() => {}}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Wait for form to be ready and data to load
    await waitFor(() => {
      expect(screen.getByLabelText('Account')).toBeInTheDocument()
    })

    // Fill out form
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'New Transaction' },
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '75.00' },
    })
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2025-10-13' },
    })
    fireEvent.change(screen.getByLabelText('Account'), {
      target: { value: mockAccounts[0].id },
    })

    // Mock failed POST request
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 }))
    )

    // Submit form
    const submitButton = screen.getByText('Add Transaction')
    fireEvent.click(submitButton)

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to create transaction')).toBeInTheDocument()
    })
  })

  it('handles closing the dialog', () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <TransactionFormDialog
          open={true}
          onClose={onClose}
          transaction={null}
        />
      </QueryClientProvider>
    )

    // Click cancel button
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })
})
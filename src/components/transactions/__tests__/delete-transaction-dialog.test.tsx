import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteTransactionDialog } from '../delete-transaction-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

describe('DeleteTransactionDialog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Mock fetch for API calls
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url)
      const isDeleteEndpoint = url.pathname.includes('/api/transactions') && (input as Request).method === 'DELETE'
      
      if (isDeleteEndpoint) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderDialog = (props: {
    open: boolean
    onClose: () => void
    transactionId: string | null
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeleteTransactionDialog {...props} />
      </QueryClientProvider>
    )
  }

  it('renders confirmation message', () => {
    renderDialog({
      open: true,
      onClose: () => {},
      transactionId: 'test-id',
    })

    expect(screen.getByText('Delete Transaction')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Are you sure you want to delete this transaction? This action cannot be undone.'
      )
    ).toBeInTheDocument()
  })

  it('handles successful deletion', async () => {
    const onClose = vi.fn()

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    // Verify API call and dialog close
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transactions/test-id'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles deletion error', async () => {
    const onClose = vi.fn()
    
    // Override the default success mock with an error response
    vi.spyOn(global, 'fetch').mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ error: 'Failed to delete transaction' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    })

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText('Failed to delete transaction')).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('handles dialog close', () => {
    const onClose = vi.fn()

    renderDialog({
      open: true,
      onClose,
      transactionId: 'test-id',
    })

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('disables buttons during deletion', async () => {
    // Mock slow DELETE request
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve(new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }, 100)
      })
    )

    renderDialog({
      open: true,
      onClose: () => {},
      transactionId: 'test-id',
    })

    // Click delete button and verify loading state
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    // Verify buttons are disabled during loading
    expect(deleteButton).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()

    // Wait for deletion to complete
    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled()
    })
  })
})
'use server';

import { z } from 'zod'
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { error } from 'console';

const sql = postgres( process.env.POSTGRES_URL!, {ssl: 'require'} );

// Define the schema for invoice data
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        message: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, {
        message: 'Please enter an amount greater than $0.',
    }),
    status: z.enum(['pending', 'paid'], {
        message: 'Please select an invoice status.',
    }),
    date: z.string(),
})

const CreateInvoice = FormSchema.omit({
    id: true 
});
const UpdateInvoice = FormSchema.omit({
    id:true
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
        date?: string[];
    },
    message?: string | null,
}

export async function createInvoice(
    prevState: State,
    formData: FormData
) {
    const invoiceData = Object.fromEntries(formData.entries());
    // convert 'amount' into cents
    invoiceData.amount = String(Number(invoiceData.amount) * 100);
    // add current date
    const date = new Date().toISOString().split('T')[0];
    invoiceData.date = date;
    console.log('invoiceData', invoiceData);

    // Validate the data against the schema
    const parsedData = CreateInvoice.safeParse(invoiceData);

    if (!parsedData.success) {
        return {
            errors: parsedData.error.flatten().fieldErrors,
            message: 'Missing fields. Failed to create invoice.',
        };
    }

    try {

        await sql`
            INSERT INTO invoices (customer_id, amount, status, date) VALUES (
                ${parsedData.data.customerId}, ${parsedData.data.amount}, ${parsedData.data.status}, ${parsedData.data.date} )
        `

    } catch (error) {
        console.error('SQL error:', error);
        return {
/*             errors: {
                customerId: ['Database Error: Failed to create invoice.'],
                amount: ['Database Error: Failed to create invoice.'],
                status: ['Database Error: Failed to create invoice.'],
                date: ['Database Error: Failed to create invoice.'],
            }, */
            message: 'Database Error: Failed to create invoice.',
        }
    }

    // Revalidate the path to update the cache
    // This will ensure that the invoices page reflects the newly created invoice
    revalidatePath('/dashboard/invoices');
    // Redirect to the invoices page after successful creation
    redirect('/dashboard/invoices');


}

export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
) {

    const invoiceData = Object.fromEntries(formData.entries());
    
    invoiceData.amount = String(Number(invoiceData.amount) * 100);
    const date = new Date().toISOString().split('T')[0];
    invoiceData.date = date;

    const parsedData = UpdateInvoice.safeParse(invoiceData);

    if (!parsedData.success) {
        return {
            errors: parsedData.error.flatten().fieldErrors,
            message: 'Invalid fields. Failed to update invoice.',
        }
    }

    try {

    await sql`
        UPDATE invoices SET 
            customer_id = ${parsedData.data.customerId}, 
            amount = ${parsedData.data.amount}, 
            status = ${parsedData.data.status}, 
            date = ${parsedData.data.date} 
        WHERE id = ${id}
    `;

    } catch (error) {
        return {
            errors: {
                customerId: ['Database Error: Failed to update invoice.'],
                amount: ['Database Error: Failed to update invoice.'],
                status: ['Database Error: Failed to update invoice.'],
                date: ['Database Error: Failed to update invoice.'],
            },
            message: 'Database Error: Failed to update invoice.',
        }
    }

    revalidatePath(`/dashboard/invoices`);
    redirect(`/dashboard/invoices`);

}

export async function deleteInvoice(id: string) {
    
    throw new Error('Not implemented delete invoice error handling');

    try {

    await sql`DELETE FROM invoices WHERE id = ${id}`;

    } catch (error) {
        console.error('SQL error:', error);
/*         throw new Error('Failed to delete invoice'); */
    }
    revalidatePath('/dashboard/invoices');

}
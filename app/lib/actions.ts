'use server';

import { z } from 'zod'
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const sql = postgres( process.env.POSTGRES_URL!, {ssl: 'require'} );

// Define the schema for invoice data
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
})

const CreateInvoice = FormSchema.omit({
    id: true 
});
const UpdateInvoice = FormSchema.omit({
    id:true
});

export async function createInvoice(
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
        console.error('Validation failed:', parsedData.error);
        throw new Error('Invalid invoice data');
    }

    await sql`
        INSERT INTO invoices (customer_id, amount, status, date) VALUES (
            ${parsedData.data.customerId}, ${parsedData.data.amount}, ${parsedData.data.status}, ${parsedData.data.date} )
    `

    // Revalidate the path to update the cache
    // This will ensure that the invoices page reflects the newly created invoice
    revalidatePath('/dashboard/invoices');
    // Redirect to the invoices page after successful creation
    redirect('/dashboard/invoices');


}

export async function updateInvoice(
    id: string,
    formData: FormData
) {

    const invoiceData = Object.fromEntries(formData.entries());
    
    invoiceData.amount = String(Number(invoiceData.amount) * 100);
    const date = new Date().toISOString().split('T')[0];
    invoiceData.date = date;

    const parsedData = UpdateInvoice.safeParse(invoiceData);

    if (!parsedData.success) {
        console.error('Validation failed:', parsedData.error);
        throw new Error('Invalid invoice data');
    }

    await sql`
        UPDATE invoices SET 
            customer_id = ${parsedData.data.customerId}, 
            amount = ${parsedData.data.amount}, 
            status = ${parsedData.data.status}, 
            date = ${parsedData.data.date} 
        WHERE id = ${id}
    `;

    revalidatePath(`/dashboard/invoices`);
    redirect(`/dashboard/invoices`);

}

export async function deleteInvoice(id: string) {

    await sql`DELETE FROM invoices WHERE id = ${id}`;

    revalidatePath('/dashboard/invoices');

}
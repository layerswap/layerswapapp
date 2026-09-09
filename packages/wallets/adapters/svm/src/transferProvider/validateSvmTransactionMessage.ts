import {
    getCompiledTransactionMessageDecoder,
    type CompiledTransactionMessage,
    type CompiledTransactionMessageWithLifetime,
    type Transaction,
} from '@solana/kit'

const computeBudgetProgram = 'ComputeBudget111111111111111111111111111111'
const changedMessageError = () => new Error('The wallet changed the Solana transaction. Please request a new transfer.')

export function haveSameSvmMessageBytes(original: Transaction, signed: Transaction): boolean {
    return signed.messageBytes.length === original.messageBytes.length
        && signed.messageBytes.every((byte, index) => byte === original.messageBytes[index])
}

export function assertSvmTransactionMessageAllowed(original: Transaction, signed: Transaction): void {
    if (haveSameSvmMessageBytes(original, signed)) return
    // Existing signatures bind the exact message. V1 fee configuration also stays exact.
    if (Object.values(original.signatures).some(signature => signature !== null)) throw changedMessageError()
    const decoder = getCompiledTransactionMessageDecoder()
    const [before, beforeEnd] = decoder.read(original.messageBytes, 0)
    const [after, afterEnd] = decoder.read(signed.messageBytes, 0)
    if (
        before.version === 1 || after.version === 1
        || beforeEnd !== original.messageBytes.length || afterEnd !== signed.messageBytes.length
        || JSON.stringify(getTransferDetails(before)) !== JSON.stringify(getTransferDetails(after))
    ) throw changedMessageError()
}

type LegacyOrV0Message = Exclude<CompiledTransactionMessage, { version: 1 }> & CompiledTransactionMessageWithLifetime

function getTransferDetails(message: LegacyOrV0Message) {
    const { header, staticAccounts } = message
    const lookups = message.version === 0 ? message.addressTableLookups ?? [] : []
    const lookupAccountCount = lookups.reduce((count, table) => count + table.writableIndexes.length + table.readonlyIndexes.length, 0)
    const accountKey = (index: number): string => {
        if (index < staticAccounts.length) return staticAccounts[index]
        const lookupIndex = index - staticAccounts.length
        if (lookupIndex >= lookupAccountCount) throw changedMessageError()
        // Lookup tables, indices, and privileges are compared below. Static account insertion
        // may shift these indices without changing which lookup accounts the instructions use.
        return `lookup:${lookupIndex}`
    }
    const accounts = staticAccounts.map((address, index) => {
        const signer = index < header.numSignerAccounts
        const writable = signer
            ? index < header.numSignerAccounts - header.numReadonlySignerAccounts
            : index < staticAccounts.length - header.numReadonlyNonSignerAccounts
        return { address, signer, writable }
    }).filter(account => account.address !== computeBudgetProgram || account.signer || account.writable)
        .sort((a, b) => a.address < b.address ? -1 : a.address > b.address ? 1 : 0)

    const feeInstructionTypes = new Set<number>()
    const instructions = message.instructions.flatMap(instruction => {
        const program = accountKey(instruction.programAddressIndex)
        const indices = instruction.accountIndices ?? []
        const data = Array.from(instruction.data ?? [])
        // Phantom may add or adjust these two fee instructions when the user signs.
        // Other Compute Budget instructions remain part of the comparison.
        if (program === computeBudgetProgram && (data[0] === 2 || data[0] === 3)) {
            if (indices.length || data.length !== (data[0] === 2 ? 5 : 9) || feeInstructionTypes.has(data[0])) {
                throw changedMessageError()
            }
            feeInstructionTypes.add(data[0])
            return []
        }
        return [{ program, accounts: indices.map(accountKey), data }]
    })
    return {
        version: message.version,
        feePayer: staticAccounts[0],
        blockhash: message.lifetimeToken,
        lookups,
        accounts,
        instructions,
    }
}

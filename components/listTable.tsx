type ListTableProps = {
    header: JSX.Element | string
    list: JSX.Element[] | string[]

}

const ListTable = ({ header, list }: ListTableProps) => {
    return (
        <div className="border-2 border-darkblue-500 rounded-md flex w-full flex-col">
            <div className="w-full border-b-2 flex border-darkblue-500">
                <p className="text-slate-200 m-3 ">{header}</p>
            </div>
            <ul className="m-3 ml-6 text-sm list-disc">
                {
                    list.map(l => (
                        <li>{l}</li>
                    ))
                }
            </ul>
        </div>
    )
}

export default ListTable
export default function CardContainer({ children }) {
    return (<div className="flex flex-col items-center justify-start py-16 w-full px-4 md:px-0">
        <div className="bg-gradient-to-r from-indigo-400 to-pink-400 shadow-lg p-3 rounded-3xl w-full md:w-10/12 md:max-w-xl lg:max-w-2xl">
            <div className="bg-white shadow-lg rounded-3xl px-14 py-10">
                {children}
            </div>
        </div>
    </div>);
}
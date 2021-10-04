export default function CardContainer({ children }) {
    return (<div className="flex flex-col items-center justify-start py-8 md:py-16 w-full px-4 md:px-0">
        <div className="bg-gradient-to-r from-indigo-400 to-pink-400 shadow-lg p-2 md:p-3 rounded-3xl w-full md:w-10/12 md:max-w-xl lg:max-w-2xl">
            <div className="bg-white shadow-lg rounded-3xl px-8 md:px-14 py-8">
                {children}
            </div>
        </div>
    </div>);
}